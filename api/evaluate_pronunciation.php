<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

function log_debug($message)
{
    $logFile = __DIR__ . '/../debug_log.txt';
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] [PRONUNCIATION] $message\n", FILE_APPEND);
}

function normalize_text_for_azure($text)
{
    // $10 -> 10 dollars
    $text = preg_replace('/\$([0-9]+(\.[0-9]+)?)/', '$1 dollars', $text);
    // £10 -> 10 pounds
    $text = preg_replace('/£([0-9]+(\.[0-9]+)?)/', '$1 pounds', $text);
    // €10 -> 10 euros
    $text = preg_replace('/€([0-9]+(\.[0-9]+)?)/', '$1 euros', $text);
    
    // % -> percent
    $text = str_replace('%', ' percent', $text);
    
    // & -> and
    $text = str_replace('&', ' and ', $text);
    
    // 連続するスペースを1つに
    $text = preg_replace('/\s+/', ' ', $text);
    
    return trim($text);
}

try {
    require_once __DIR__ . '/../config.php';

    header('Content-Type: application/json');

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method Not Allowed']);
        exit;
    }

    // 例文テキストの取得
    $text = $_POST['text'] ?? '';
    $text = trim($text);
    $aiStyle = $_POST['ai_style'] ?? 'polite';

    // AzureおよびGemini向けにテキストを正規化 (記号・数字のスペルアウト)
    $normalizedText = normalize_text_for_azure($text);

    if (empty($text)) {
        http_response_code(400);
        echo json_encode(['error' => 'Reference text is required.']);
        exit;
    }

    // 音声ファイルの取得
    $audioFile = $_FILES['audio'] ?? null;
    $hasAudio = $audioFile && $audioFile['error'] === UPLOAD_ERR_OK;
    $fileSize = $hasAudio ? $audioFile['size'] : 0;

    log_debug("Request received. Text: '$text', Has Audio: " . ($hasAudio ? 'Yes' : 'No') . ", Size: $fileSize bytes, UploadError: " . ($audioFile ? $audioFile['error'] : 'no_file'));


    // Azureのキーまたはリージョンが未設定の場合はモックモード
    $azureKey = defined('AZURE_SPEECH_KEY') ? AZURE_SPEECH_KEY : '';
    $azureRegion = defined('AZURE_SPEECH_REGION') ? AZURE_SPEECH_REGION : '';

    if (empty($azureKey) || empty($azureRegion)) {
        log_debug("Azure API credentials not fully configured. Running in mockup mode.");
        
        // モック評価データの生成
        // テキストから不要な記号を除去し、単語に分割
        $cleanText = preg_replace('/[.,\/#!$%\^&\*;:{}=\-_`~()?]/', '', $normalizedText);
        $wordsList = preg_split('/\s+/', $cleanText);
        $wordsList = array_filter($wordsList);

        $wordsResult = [];
        $totalAccuracy = 0;
        $wordCount = count($wordsList);

        // 1つの単語だけ発音ミス（Mispronunciation）にする（単語数が3つ以上の場合に15%の確率で）
        $mispronounceIndex = ($wordCount >= 3 && rand(1, 100) <= 70) ? rand(0, $wordCount - 1) : -1;

        $idx = 0;
        foreach ($wordsList as $word) {
            $isMispronounced = ($idx === $mispronounceIndex);
            $accuracy = $isMispronounced ? rand(45, 65) : rand(85, 100);
            $errorType = $isMispronounced ? 'Mispronunciation' : 'None';

            $totalAccuracy += $accuracy;

            $wordsResult[] = [
                'Word' => $word,
                'PronunciationAssessment' => [
                    'AccuracyScore' => (float)$accuracy,
                    'ErrorType' => $errorType
                ]
            ];
            $idx++;
        }

        $avgAccuracy = $wordCount > 0 ? round($totalAccuracy / $wordCount, 1) : 0;
        $fluency = rand(80, 95);
        $completeness = 100; // すべて発音したと仮定
        $pronScore = round(($avgAccuracy * 0.4) + ($fluency * 0.4) + ($completeness * 0.2), 1);

        $scores = [
            'PronScore' => $pronScore,
            'AccuracyScore' => $avgAccuracy,
            'FluencyScore' => (float)$fluency,
            'CompletenessScore' => (float)$completeness
        ];

        $userAudioUrl = $hasAudio ? save_user_recording($audioFile['tmp_name']) : null;
        $advice = get_pronunciation_advice($text, $scores, $wordsResult, null, $aiStyle);

        $response = [
            'is_mock' => true,
            'RecognitionStatus' => 'Success',
            'PronunciationAssessment' => $scores,
            'Words' => $wordsResult,
            'advice' => $advice,
            'user_audio_url' => $userAudioUrl
        ];

        echo json_encode($response);
        exit;
    }

    // 本番モード：Azure Speech APIへのリクエスト
    if (!$hasAudio) {
        http_response_code(400);
        echo json_encode(['error' => 'Audio file is required for actual assessment.']);
        exit;
    }

    $audioPath = $audioFile['tmp_name'];
    $audioData = file_get_contents($audioPath);

    // Pronunciation Assessment パラメータの作成
    $assessmentParams = [
        'ReferenceText' => $normalizedText,
        'GradingSystem' => 'HundredMark',
        'Granularity' => 'Word', // Word単位で評価
        'Dimension' => 'Comprehensive',
        'EnableMisc' => false
    ];
    $assessmentParamsBase64 = base64_encode(json_encode($assessmentParams));

    // Azure REST API エンドポイント
    $url = "https://{$azureRegion}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US";

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $audioData);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Ocp-Apim-Subscription-Key: {$azureKey}",
        "Pronunciation-Assessment: {$assessmentParamsBase64}",
        "Content-Type: audio/wav; codecs=audio/pcm; samplerate=16000",
        "Accept: application/json",
        "Transfer-Encoding: chunked"
    ]);

    // REST API では Transfer-Encoding chunked のためのダミーハンドラや、ファイルの直接読み込み送信が推奨されるが、
    // 小さいファイルなので PHP の curl_setopt でデータ全体を送信しても動作する。
    
    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($result === false) {
        log_debug("Curl error: " . $curlError);
        http_response_code(500);
        echo json_encode(['error' => 'Failed to connect to Azure Speech API.', 'details' => $curlError]);
        exit;
    }

    log_debug("Azure API Response HTTP Code: $httpCode");
    log_debug("Azure API Raw Response: " . $result);

    
    if ($httpCode !== 200) {
        log_debug("Azure API Error Response: " . $result);
        http_response_code($httpCode);
        echo json_encode(['error' => 'Azure API error.', 'details' => json_decode($result, true) ?: $result]);
        exit;
    }

    $azureData = json_decode($result, true);
    if (!$azureData || ($azureData['RecognitionStatus'] ?? '') !== 'Success') {
        log_debug("Azure API unrecognized response format or failure status.");
        http_response_code(500);
        echo json_encode(['error' => 'Speech recognition or assessment failed.', 'azure_response' => $azureData]);
        exit;
    }

    // レスポンスの簡易化・統一化
    // Azure の REST API は NBest という配列に結果が入る
    $bestResult = $azureData['NBest'][0] ?? null;
    if (!$bestResult) {
        http_response_code(500);
        echo json_encode(['error' => 'No assessment result found in Azure response.']);
        exit;
    }

    $words = $bestResult['Words'] ?? [];

    $wordsResult = [];
    foreach ($words as $w) {
        $wordsResult[] = [
            'Word' => $w['Word'] ?? '',
            'PronunciationAssessment' => [
                'AccuracyScore' => (float)($w['AccuracyScore'] ?? 0),
                'ErrorType' => $w['ErrorType'] ?? 'None'
            ]
        ];
    }

        $scores = [
            'PronScore' => (float)($bestResult['PronScore'] ?? 0),
            'AccuracyScore' => (float)($bestResult['AccuracyScore'] ?? 0),
            'FluencyScore' => (float)($bestResult['FluencyScore'] ?? 0),
            'CompletenessScore' => (float)($bestResult['CompletenessScore'] ?? 0)
        ];

        $userAudioUrl = save_user_recording($audioPath);
        $advice = get_pronunciation_advice($text, $scores, $wordsResult, $audioPath, $aiStyle);

        $response = [
            'is_mock' => false,
            'RecognitionStatus' => 'Success',
            'PronunciationAssessment' => $scores,
            'Words' => $wordsResult,
            'advice' => $advice,
            'user_audio_url' => $userAudioUrl
        ];

        echo json_encode($response);

} catch (Exception $e) {
    log_debug("Exception: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal Server Error', 'message' => $e->getMessage()]);
}

function get_pronunciation_advice($text, $scores, $wordsResult, $audioPath = null, $aiStyle = 'polite')
{
    $geminiApiKey = defined('GEMINI_API_KEY') ? GEMINI_API_KEY : '';
    $geminiModel = defined('GEMINI_MODEL') ? GEMINI_MODEL : 'gemini-3-flash-preview';

    if (empty($geminiApiKey)) {
        return "発音評価が完了しました。APIキーを設定すると詳細なアドバイスが表示されます。";
    }

    $pronScore = $scores['PronScore'] ?? 0;
    $accuracy = $scores['AccuracyScore'] ?? 0;
    $fluency = $scores['FluencyScore'] ?? 0;
    $completeness = $scores['CompletenessScore'] ?? 0;

    $badWords = [];
    foreach ($wordsResult as $w) {
        $error = $w['PronunciationAssessment']['ErrorType'] ?? 'None';
        if ($error !== 'None') {
            $badWords[] = '"' . $w['Word'] . '" (' . ($error === 'Mispronunciation' ? '発音ミス' : ($error === 'Omission' ? '聞き取り漏れ' : '余計な挿入')) . ')';
        }
    }

    $badWordsStr = empty($badWords) ? '特になし（全体的に良好）' : implode(', ', $badWords);

    $styleInstructions = [
        'polite' => "丁寧な「ですます調」で回答・解説してください。",
        'friendly' => "親しみ友達のような、タメ口でフレンドリーな口調で回答・解説してください。",
        'jk' => "女子高生のような口調（例：「〜だね！」「マジで」「うける」など）で、明るくフレンドリーに回答・解説してください。ただし、過度な褒め言葉や持ち上げすぎ（例：「天才じゃん！」など）は避け、建設的なアドバイスを重視してください。"
    ];
    $stylePrompt = $styleInstructions[$aiStyle] ?? $styleInstructions['polite'];

    $prompt = "
あなたは親切でプロフェッショナルな英語の発音コーチです。
ユーザーがマイクに向かって英文を発音し、その実際の録音音声ファイルがこのメッセージに添付されています。

本来の英文: \"{$text}\"

Azure Speech Serviceによる客観的な評価指標（参考データ）:
- 総合評価スコア: {$pronScore}点 / 100
- 正確性 (Accuracy): {$accuracy}点
- 流暢さ (Fluency): {$fluency}点
- 完全性 (Completeness): {$completeness}点
- 判定が低下した主な単語: {$badWordsStr}

【指示】
1. 添付された実際のユーザーの録音音声を耳で聴き取って、発音を直接添削・アドバイスしてください。
2. 音声を直接聴いて感じた、イントネーションの自然さ、カタカナ英語っぽさの有無、特定の単語を発音した際の母音や子音の物理的なズレ（舌の使い方や息の出し方など）を耳で聴いて分析し、一般的な単語解説ではなく「その音声そのものに対する直接的な指摘」をしてください。
3. どのように口や舌を動かせばよりネイティブに近い自然な発音に改善できるかのアドバイスを提示してください。
4. 全体で3〜4行（長くても5行程度）の日本語テキストにまとめ、余計な前置きは省いてアドバイスの内容だけを直接出力してください。
5. 回答時の口調やキャラクターについては、次の指示に必ず従ってください: {$stylePrompt}
";

    // parts配列の組み立て
    $parts = [
        ['text' => $prompt]
    ];

    // 音声ファイルが存在する場合は、Base64エンコードしてインラインデータとして追加
    if ($audioPath && file_exists($audioPath) && filesize($audioPath) > 0) {
        $audioBytes = file_get_contents($audioPath);
        $audioBase64 = base64_encode($audioBytes);
        $parts[] = [
            'inlineData' => [
                'mimeType' => 'audio/wav',
                'data' => $audioBase64
            ]
        ];
        log_debug("Attached audio file to Gemini request (Size: " . strlen($audioBase64) . " base64 chars)");
    }

    $url = "https://generativelanguage.googleapis.com/v1beta/models/{$geminiModel}:generateContent?key={$geminiApiKey}";
    $postData = [
        'contents' => [
            [
                'parts' => $parts
            ]
        ]
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        log_debug("Gemini API Error Response (HTTP $httpCode): " . $response);
        return "発音スコア: {$pronScore}点。詳細アドバイスの生成に失敗しました（HTTP {$httpCode}）。";
    }

    $result = json_decode($response, true);
    $advice = $result['candidates'][0]['content']['parts'][0]['text'] ?? '';
    return trim($advice);
}

function save_user_recording($tmpPath)
{
    if (empty($tmpPath) || !file_exists($tmpPath)) {
        return null;
    }

    $targetDir = __DIR__ . '/../audio/user_recordings/';
    if (!is_dir($targetDir)) {
        mkdir($targetDir, 0755, true);
    }

    // クリーンアップの実行 (上限 500MB)
    cleanup_user_recordings($targetDir, 524288000);

    // 一意のファイル名生成 (user_rec_[ユニークID]_[タイムスタンプ].wav)
    $fileName = 'user_rec_' . uniqid() . '_' . time() . '.wav';
    $destPath = $targetDir . $fileName;

    if (copy($tmpPath, $destPath)) {
        log_debug("Saved user recording to: $destPath");
        return 'audio/user_recordings/' . $fileName;
    }

    log_debug("Failed to save user recording to: $destPath");
    return null;
}

function cleanup_user_recordings($dir, $maxSize)
{
    if (!is_dir($dir)) {
        return;
    }

    $files = [];
    $totalSize = 0;

    $iterator = new DirectoryIterator($dir);
    foreach ($iterator as $fileinfo) {
        if ($fileinfo->isFile() && $fileinfo->getExtension() === 'wav') {
            $files[] = [
                'path' => $fileinfo->getPathname(),
                'mtime' => $fileinfo->getMTime(),
                'size' => $fileinfo->getSize()
            ];
            $totalSize += $fileinfo->getSize();
        }
    }

    // 容量上限を超えている場合、古いファイルから削除
    if ($totalSize > $maxSize) {
        // 更新日時で昇順ソート（古い順）
        usort($files, function ($a, $b) {
            return $a['mtime'] <=> $b['mtime'];
        });

        foreach ($files as $file) {
            if ($totalSize <= $maxSize) {
                break;
            }
            if (unlink($file['path'])) {
                $totalSize -= $file['size'];
                log_debug("Deleted old user recording due to storage limit: " . $file['path']);
            }
        }
    }
}


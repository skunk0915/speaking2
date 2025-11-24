<?php
require_once __DIR__ . '/../config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$type = $input['type'] ?? 'new'; // 'new' or 'continue'
$context = $input['context'] ?? []; // Array of previous messages
$length = $input['length'] ?? 100; // Target length

// Construct the prompt
$prompt = "";
if ($type === 'new') {
    // Load situations
    $situationsFile = __DIR__ . '/../data/situations.json';
    $situationText = "";
    if (file_exists($situationsFile)) {
        $situations = json_decode(file_get_contents($situationsFile), true);
        if ($situations && is_array($situations)) {
            $randomSituation = $situations[array_rand($situations)];
            $situationText = "シチュエーション: " . $randomSituation['situation'] . " (" . $randomSituation['category'] . ")";
        }
    }

    $prompt = "日常会話のロールプレイシナリオを作成してください。
    {$situationText}
    
    役割定義:
    - 'japanese': 相手（AI）がユーザーに話しかける言葉です。
    - 'sample_user_japanese': それに対するユーザー（あなた）の返答例です。
    
    指示:
    - 文字数は{$length}文字程度にしてください。
    - 1人の発話のみを含めてください。複数人の会話形式にはしないでください。
    - シーンの説明や話者名を含めないでください。
    - 「もちろんです」などの前置きは一切不要です。
    - 純粋な会話文のみを出力してください。
    - 文脈から上下関係や役割が明確になるようにしてください（例：上司と部下、店員と客など）。
    
    出力はJSON形式で、以下のキーを含めてください:
      - 'japanese': 生成した日本語の会話文（相手の発話）
      - 'english': その英訳
      - 'sample_user_japanese': この発話に対する、ユーザーが返答する際の自然な日本語の回答例（短文で。ユーザーの立場に立った返答にすること）";
} elseif ($type === 'question') {
    $history = implode("\n", array_map(function($item) {
        $role = $item['role'] === 'user' ? 'ユーザー' : 'AI';
        return "{$role}: " . $item['text'];
    }, $input['context']['history'] ?? []));

    $situation = $input['context']['situation'] ?? '';
    $userInput = $input['context']['user_input'] ?? '';
    $correction = $input['context']['correction'] ?? '';

    $prompt = "あなたは英語学習のアシスタントAIです。ユーザーからの質問に答えてください。
    
    前提となる会話コンテキスト:
    【状況/問いかけ】: {$situation}
    【ユーザーの回答】: {$userInput}
    【AIによる添削】: {$correction}
    
    これまでのQ&A履歴:
    {$history}
    
    ユーザーの質問:
    {$input['text']}
    
    指示:
    - 上記の「前提となる会話コンテキスト」を踏まえて、ユーザーの質問に答えてください。
    - ユーザーは自分の回答がなぜ修正されたのか、あるいはもっと良い表現がないかなどを知りたがっています。
    - 丁寧でわかりやすい日本語で答えてください。
    - ユーザーが英語での回答を求めている場合、または「簡単な単語で」などの指示がある場合は、中学生レベルの簡単な英語で回答してください。
    - 必要に応じて英語の例文を提示してください。
    - 出力はJSON形式で、以下のキーを含めてください:
      - 'answer': 回答内容（マークダウン形式で記述可）";
} elseif ($type === 'variation') {
    $originalJapanese = $input['context']['japanese'] ?? '';
    $originalEnglish = $input['context']['english'] ?? '';

    // Randomize the direction of variation to prevent same results
    $styles = [
        "よりカジュアルな表現にしてください。",
        "より丁寧・フォーマルな表現にしてください。",
        "全く別の単語やイディオムを使って表現してください。",
        "少しニュアンスを変えて、より感情を込めた表現にしてください。",
        "簡潔で短い表現にしてください。",
        "ネイティブスピーカーがよく使う、こなれた表現にしてください。"
    ];
    $randomStyle = $styles[array_rand($styles)];

    $prompt = "以下の会話フレーズの「別バリエーション」を生成してください。
    
    元のフレーズ:
    日本語: {$originalJapanese}
    英語: {$originalEnglish}
    
    指示:
    - 元のフレーズと同じ意味・意図を持ちつつ、異なる言い回しや表現を考えてください。
    - **{$randomStyle}**
    - 元のフレーズが既に自然な場合でも、別の自然な言い方を提示してください。
    - 文字数は元のフレーズと同程度にしてください。
    - 出力はJSON形式で、以下のキーを含めてください:
      - 'japanese': 生成した日本語の会話文（相手の発話）
      - 'english': その英訳
      - 'sample_user_japanese': この発話に対する、ユーザーが返答する際の自然な日本語の回答例（短文で。ユーザーの立場に立った返答にすること）
      - 'point': このバリエーションのポイントや特徴の簡潔な解説（例：「より丁寧な表現にしました」「〇〇というイディオムを使いました」など）";
} elseif ($type === 'simple') {
    $originalJapanese = $input['context']['japanese'] ?? '';
    $originalEnglish = $input['context']['english'] ?? '';

    $prompt = "以下の会話フレーズを「簡単な英語（中学生レベル）」に書き換えてください。
    
    元のフレーズ:
    日本語: {$originalJapanese}
    英語: {$originalEnglish}
    
    指示:
    - 元のフレーズと同じ意味・意図を保ちつつ、中学生で習うような基本的な単語や文法を使って表現してください。
    - 難しいイディオムや構文は避けてください。
    - 出力はJSON形式で、以下のキーを含めてください:
      - 'japanese': 生成した日本語の会話文（元の意味に近い、自然な日本語）
      - 'english': その簡単な英訳
      - 'sample_user_japanese': この発話に対する、ユーザーが返答する際の自然な日本語の回答例（短文で）
      - 'point': どのように簡単にしたかの解説（例：「難しい単語〇〇を簡単な〇〇に言い換えました」など）";
} elseif ($type === 'formal') {
    $originalJapanese = $input['context']['japanese'] ?? '';
    $originalEnglish = $input['context']['english'] ?? '';

    $prompt = "以下の会話フレーズを「フォーマル・丁寧な表現」に書き換えてください。
    
    元のフレーズ:
    日本語: {$originalJapanese}
    英語: {$originalEnglish}
    
    指示:
    - ビジネスシーンや目上の人に対して使えるような、丁寧で礼儀正しい表現にしてください。
    - 出力はJSON形式で、以下のキーを含めてください:
      - 'japanese': 生成した日本語の会話文
      - 'english': その英訳
      - 'sample_user_japanese': この発話に対する、ユーザーが返答する際の自然な日本語の回答例
      - 'point': どの部分がフォーマルなのかの解説（例：「〇〇という丁寧な表現を使いました」など）";
} elseif ($type === 'casual') {
    $originalJapanese = $input['context']['japanese'] ?? '';
    $originalEnglish = $input['context']['english'] ?? '';

    $prompt = "以下の会話フレーズを「カジュアル・親しい間柄の表現」に書き換えてください。
    
    元のフレーズ:
    日本語: {$originalJapanese}
    英語: {$originalEnglish}
    
    指示:
    - 友人や家族など、親しい間柄で使うような砕けた表現やスラングを含めた表現にしてください。
    - 出力はJSON形式で、以下のキーを含めてください:
      - 'japanese': 生成した日本語の会話文
      - 'english': その英訳
      - 'sample_user_japanese': この発話に対する、ユーザーが返答する際の自然な日本語の回答例
      - 'point': どの部分がカジュアルなのかの解説（例：「スラングの〇〇を使いました」「短縮形を使いました」など）";
} else {
    $history = implode("\n", array_map(function($item) {
        if (isset($item['role']) && $item['role'] === 'user') {
            return "あなた(ユーザー): " . $item['text'];
        } else {
            return "相手: " . ($item['japanese'] ?? '');
        }
    }, $context));
    
    // Extract recent conversation texts to prevent repetition
    $recentTexts = array_slice(array_map(function($item) {
        return $item['japanese'] ?? '';
    }, array_filter($context, function($item) {
        return !isset($item['role']) || $item['role'] !== 'user';
    })), -3);
    
    $recentTextsStr = implode("\n", array_filter($recentTexts));
    
    $prompt = "以下の会話の文脈に続く、相手(AI)の自然な日本語の返答を生成してください。
    
    これまでの会話:
    {$history}
    
    役割定義:
    - 直前の発言は「ユーザー」によるものです。
    - あなたは「相手」として、ユーザーの発言を受けて返答してください。
    - ユーザーの言葉を繰り返したり、ユーザーの立場(感謝する側など)を奪ったりしないでください。
    - 会話の流れが自然に続くようにしてください。
    
    重要な制約:
    - 直前の会話と同じ内容や似た内容を繰り返さないでください。
    - 例えば、「承知いたしました。スケジュールを確認して、いくつか候補日をご連絡します。」の後に「ありがとうございます。ご都合の良いお日にちをいくつかお教えいただけますでしょうか?」のように、同じことを繰り返すのは禁止です。
    - 会話を自然に進展させ、新しい情報や具体的な内容を含めてください。
    " . (!empty($recentTextsStr) ? "\n    直近の相手の発言(これらと似た内容を避けること):\n    {$recentTextsStr}\n    " : "") . "
    指示:
    - 文字数は{$length}文字程度にしてください。
    - 1人の発話のみを含めてください。
    - シーンの説明や話者名を含めないでください。
    - 「もちろんです」などの前置きは一切不要です。
    - 純粋な会話文のみを出力してください。
    - 出力はJSON形式で、以下のキーを含めてください:
      - 'japanese': 生成した日本語の会話文(相手の発話)
      - 'english': その英訳
      - 'sample_user_japanese': この発話に対する、ユーザーが返答する際の自然な日本語の回答例(短文で。ユーザーの立場に立った返答にすること)";
}

// Call Gemini API
$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" . GEMINI_API_KEY;

$data = [
    'contents' => [
        [
            'parts' => [
                ['text' => $prompt]
            ]
        ]
    ],
    'generationConfig' => [
        'responseMimeType' => 'application/json'
    ]
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200) {
    http_response_code(500);
    $errorMsg = 'API Request Failed with HTTP Code: ' . $httpCode;
    file_put_contents(__DIR__ . '/../debug_log.txt', date('Y-m-d H:i:s') . " Error: " . $errorMsg . "\nDetails: " . $response . "\n", FILE_APPEND);
    http_response_code(500);
    echo json_encode(['error' => $errorMsg, 'details' => $response]);
    exit;
}

try {
    $result = json_decode($response, true);
    if (isset($result['candidates'][0]['content']['parts'][0]['text'])) {
        $text = $result['candidates'][0]['content']['parts'][0]['text'];
        
        // Log raw response for debugging
        file_put_contents(__DIR__ . '/../debug_log.txt', date('Y-m-d H:i:s') . " Raw API Response: " . $text . "\n", FILE_APPEND);

        // Strip markdown code blocks if present
        $text = preg_replace('/^```json\s*|\s*```$/', '', $text);
        
        // Validate JSON content
        $json = json_decode($text, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $errorMsg = 'Invalid JSON from Gemini: ' . json_last_error_msg();
            file_put_contents(__DIR__ . '/../debug_log.txt', date('Y-m-d H:i:s') . " Error: " . $errorMsg . "\nRaw: " . $text . "\n", FILE_APPEND);
            
            http_response_code(500);
            echo json_encode(['error' => $errorMsg, 'raw' => $text]);
            exit;
        }
        
        // Handle case where Gemini returns an array of objects
        if (isset($json[0]) && is_array($json[0])) {
            $json = $json[0];
        }
        
        // Validation based on expected keys
        if (isset($json['answer'])) {
            // Q&A Response
            if (empty($json['answer'])) {
                 $errorMsg = 'Empty answer from Gemini';
                 file_put_contents(__DIR__ . '/../debug_log.txt', date('Y-m-d H:i:s') . " Error: " . $errorMsg . "\nData: " . print_r($json, true) . "\n", FILE_APPEND);
                 http_response_code(500);
                 echo json_encode(['error' => $errorMsg, 'data' => $json]);
                 exit;
            }
        } else {
            // Conversation Response
            if (empty($json['japanese']) || empty($json['english'])) {
                $errorMsg = 'Incomplete data from Gemini';
                file_put_contents(__DIR__ . '/../debug_log.txt', date('Y-m-d H:i:s') . " Error: " . $errorMsg . "\nData: " . print_r($json, true) . "\n", FILE_APPEND);

                http_response_code(500);
                echo json_encode(['error' => $errorMsg, 'data' => $json]);
                exit;
            }
        }

        // Ensure sample_user_japanese exists
        if (!isset($json['sample_user_japanese'])) {
            $json['sample_user_japanese'] = ""; // Default empty if missing
        }

        echo json_encode($json);
    } else {
        $errorMsg = 'Invalid API Response Structure';
        file_put_contents(__DIR__ . '/../debug_log.txt', date('Y-m-d H:i:s') . " Error: " . $errorMsg . "\nFull Response: " . $response . "\n", FILE_APPEND);

        http_response_code(500);
        echo json_encode(['error' => $errorMsg]);
    }
} catch (Exception $e) {
    $errorMsg = 'An unexpected error occurred: ' . $e->getMessage();
    file_put_contents(__DIR__ . '/../debug_log.txt', date('Y-m-d H:i:s') . " Exception: " . $errorMsg . "\nTrace: " . $e->getTraceAsString() . "\n", FILE_APPEND);
    http_response_code(500);
    echo json_encode(['error' => $errorMsg]);
}

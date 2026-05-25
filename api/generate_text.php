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
$length = $input['length'] ?? 20; // Target length
$englishLevel = $input['english_level'] ?? 'simple';
$aiStyle = $input['ai_style'] ?? 'polite';

$styleInstructions = [
    'polite' => "標準的な「ですます調」で回答・解説してください。",
    'friendly' => "親しい友達のような、タメ口でフレンドリーな口調で回答・解説してください。",
    'jk' => "女子高生のような口調（例：「〜だね！」「〜じゃん？」「マジで」「うける」など）で、明るくフレンドリーに回答・解説してください。ただし、過度な褒め言葉や持ち上げすぎ（例：「天才じゃん！」など）は避け、建設的な内容を心がけてください。"
];

$levelInstructions = [
    'native' => "文法的な正確さよりも、現地のネイティブが日常会話で実際に使う『生きた表現』を優先してください。教科書的な硬い表現は避け、省略形や口語的な繋ぎ、自然なリズムを重視した、人間味のある日常表現にしてください。",
    'formal' => "ビジネスや正式な場で使われる、丁寧でフォーマルな表現を使用してください。",
    'casual' => "友人同士で使うような、カジュアルで親しみやすい表現を使用してください。",
    'simple' => "基本的で簡単な単語や文法（中学生レベル）を使用した、分かりやすい表現にしてください。"
];

$currentStyleInst = $styleInstructions[$aiStyle] ?? $styleInstructions['polite'];
$currentLevelInst = $levelInstructions[$englishLevel] ?? $levelInstructions['native'];

function normalizeSituationOption($text) {
    $text = trim((string)$text);
    $text = preg_replace('/^[「『"\']+|[」』"\']+$/u', '', $text);
    $text = preg_replace('/^(いらっしゃいませ|ようこそ|こんにちは|こんばんは)[。！!？?、,\s]*/u', '', $text);
    $text = preg_replace('/^(恐れ入りますが|失礼ですが|本日は)[、,\s]*/u', '', $text);
    $text = preg_replace('/\s+/u', '', $text);
    $text = preg_replace('/[。．、，！!？?\-ー〜～…]/u', '', $text);
    return mb_strtolower($text, 'UTF-8');
}

function situationOptionSimilarityBase($text) {
    $text = normalizeSituationOption($text);
    $text = preg_replace('/(を)?(お願いできますか|お願いします|いただけますか|伺えますか|ございますか|でしょうか|ですか|ますか|ください)$/u', '', $text);
    return $text;
}

function areSituationOptionsSimilar($left, $right) {
    $leftNormalized = normalizeSituationOption($left);
    $rightNormalized = normalizeSituationOption($right);

    if ($leftNormalized === '' || $rightNormalized === '') {
        return false;
    }

    if ($leftNormalized === $rightNormalized) {
        return true;
    }

    if (mb_strlen($leftNormalized, 'UTF-8') >= 6 && (mb_strpos($leftNormalized, $rightNormalized, 0, 'UTF-8') !== false || mb_strpos($rightNormalized, $leftNormalized, 0, 'UTF-8') !== false)) {
        return true;
    }

    $leftBase = situationOptionSimilarityBase($left);
    $rightBase = situationOptionSimilarityBase($right);
    if ($leftBase !== '' && $leftBase === $rightBase) {
        return true;
    }

    similar_text($leftNormalized, $rightNormalized, $similarity);
    if ($similarity >= 82) {
        return true;
    }

    if ($leftBase !== '' && $rightBase !== '') {
        similar_text($leftBase, $rightBase, $baseSimilarity);
        if ($baseSimilarity >= 78) {
            return true;
        }
    }

    return false;
}

function dedupeSituationOptions(array $candidates, array $excludeList = []) {
    $unique = [];
    foreach ($candidates as $candidate) {
        $candidate = trim((string)$candidate);
        if ($candidate === '') {
            continue;
        }

        $isDuplicate = false;
        foreach ($excludeList as $excluded) {
            if (areSituationOptionsSimilar($candidate, $excluded)) {
                $isDuplicate = true;
                break;
            }
        }
        if ($isDuplicate) {
            continue;
        }

        foreach ($unique as $existing) {
            if (areSituationOptionsSimilar($candidate, $existing)) {
                $isDuplicate = true;
                break;
            }
        }
        if ($isDuplicate) {
            continue;
        }

        $unique[] = $candidate;
    }

    return array_values($unique);
}

function getSituationOptionLengthBounds($targetLength, $attempt = 1) {
    $targetLength = max(10, (int)$targetLength);
    $baseMargin = max(6, (int)round($targetLength * 0.08));
    $attemptMargin = max(0, $attempt - 1) * 4;
    $margin = $baseMargin + $attemptMargin;

    return [
        max(8, $targetLength - $margin),
        $targetLength + $margin
    ];
}

function countSituationOptionChars($text) {
    $text = preg_replace('/\s+/u', '', trim((string)$text));
    return mb_strlen($text, 'UTF-8');
}

function filterSituationOptionsByLength(array $candidates, $targetLength, $attempt = 1) {
    [$minLength, $maxLength] = getSituationOptionLengthBounds($targetLength, $attempt);
    $filtered = [];

    foreach ($candidates as $candidate) {
        $candidateLength = countSituationOptionChars($candidate);
        if ($candidateLength < $minLength || $candidateLength > $maxLength) {
            continue;
        }
        $filtered[] = trim((string)$candidate);
    }

    usort($filtered, function ($left, $right) use ($targetLength) {
        $leftDelta = abs(countSituationOptionChars($left) - $targetLength);
        $rightDelta = abs(countSituationOptionChars($right) - $targetLength);
        if ($leftDelta === $rightDelta) {
            return countSituationOptionChars($right) <=> countSituationOptionChars($left);
        }
        return $leftDelta <=> $rightDelta;
    });

    return array_values($filtered);
}

function sortSituationOptionsByLengthCloseness(array $candidates, $targetLength) {
    $sorted = array_values(array_filter(array_map(function ($candidate) {
        return trim((string)$candidate);
    }, $candidates), function ($candidate) {
        return $candidate !== '';
    }));

    usort($sorted, function ($left, $right) use ($targetLength) {
        $leftDelta = abs(countSituationOptionChars($left) - $targetLength);
        $rightDelta = abs(countSituationOptionChars($right) - $targetLength);
        if ($leftDelta === $rightDelta) {
            return countSituationOptionChars($right) <=> countSituationOptionChars($left);
        }
        return $leftDelta <=> $rightDelta;
    });

    return $sorted;
}

function buildSituationOptionsRewritePrompt($situation, array $seedOptions, array $excludeList = [], $targetCount = 10, $attempt = 1, $length = 20) {
    [$minLength, $maxLength] = getSituationOptionLengthBounds($length, $attempt);

    $seedInstruction = !empty($seedOptions)
        ? "\n【長さを調整する元候補】\n- " . implode("\n- ", $seedOptions)
        : '';
    $excludeInstruction = !empty($excludeList)
        ? "\n【使ってはいけない既出候補】\n- " . implode("\n- ", $excludeList)
        : '';

    return "指定されたシチュエーションの会話候補について、元候補の内容や切り口を活かしながら、文字数だけを中心に調整した日本語フレーズを{$targetCount}個生成してください。

【シチュエーション】
{$situation}
{$seedInstruction}
{$excludeInstruction}

指示:
- 元候補の『確認したい内容』や『話しかけの意図』は活かしつつ、文を言い換えたり情報を足したり削ったりして、各候補を{$minLength}〜{$maxLength}文字に必ず収めてください。
- 通常生成と同じく、1人の発話のみを出してください。
- 文字数を合わせることが最優先です。ただし、不自然な言い回しや意味崩れは避けてください。
- 同じ内容の言い換えを並べず、切り口は散らしてください。
- 単なる挨拶や汎用的なフレーズは避けてください。
- 各候補について、出力前に実際の文字数を数えて条件内か確認してください。
- 出力はJSON形式で、以下のキーを含めてください:
  - 'situation': 使用したシチュエーション名
  - 'options': 調整後の日本語フレーズの配列（文字列の配列、{$targetCount}個）";
}

function buildSituationOptionsPrompt($situation, array $excludeList = [], $targetCount = 10, $attempt = 1, $length = 20) {
    $excludeInstruction = '';
    if (!empty($excludeList)) {
        $excludeInstruction = "\n【除外する既出候補】\n- " . implode("\n- ", $excludeList);
    }

    [$minLength, $maxLength] = getSituationOptionLengthBounds($length, $attempt);

    $retryInstruction = '';
    if ($attempt > 1) {
        $retryInstruction = "\n- 直前までに似た候補や文字数条件を外した候補が多かったため、今回は意味の切り口が重ならない案を優先してください。\n- 同じ要件を丁寧さだけ変えて並べるのは禁止です。\n- 出力前に、各候補が他の候補と『何を確認しているか』の観点で重複していないか確認してください。\n- 各候補が{$minLength}〜{$maxLength}文字に収まっているか必ず数えてください。";
    }

    return "指定されたシチュエーションにおいて、相手（AI）がユーザーに話しかける最初の日本語フレーズ（相手の発話）の候補を{$targetCount}個生成してください。

【シチュエーション】
{$situation}
{$excludeInstruction}

指示:
- まず頭の中で20案以上発想し、その中から意味や目的が重ならないものだけを{$targetCount}個選んでください。
- 同じ内容の言い換えは不可です。『ご予約のお名前をお願いします』『ご予約名を伺えますか』のように、確認したい中身が同じなら重複とみなします。
- 単なる挨拶や汎用的なフレーズは避け、その場で本当にありそうな確認・案内・依頼・質問にしてください。
- ホテルのチェックインなら、予約確認、本人確認書類、支払い方法、朝食、部屋タイプ、チェックアウト時間、デポジット、駐車場、Wi-Fi、荷物、設備案内など、切り口を散らしてください。
- ユーザーが英語で返答しやすく、会話が広がる具体的な一言にしてください。
- 各フレーズは必ず{$minLength}〜{$maxLength}文字に収めてください。これは努力目標ではなく必須条件です。
- {$length}文字前後のニュアンスに寄せ、短すぎる文や長すぎる文は出力しないでください。{$retryInstruction}
- 出力はJSON形式で、以下のキーを含めてください:
  - 'situation': 使用したシチュエーション名
  - 'options': 生成した日本語フレーズの配列（文字列の配列、{$targetCount}個）";
}

function callGeminiJson($prompt) {
    $url = "https://generativelanguage.googleapis.com/v1beta/models/" . GEMINI_MODEL . ":generateContent?key=" . GEMINI_API_KEY;
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
        $errorMsg = 'API Request Failed with HTTP Code: ' . $httpCode;
        file_put_contents(__DIR__ . '/../debug_log.txt', date('Y-m-d H:i:s') . " Error: " . $errorMsg . "\nDetails: " . $response . "\n", FILE_APPEND);
        throw new Exception($errorMsg);
    }

    $result = json_decode($response, true);
    if (!isset($result['candidates'][0]['content']['parts'][0]['text'])) {
        $errorMsg = 'Invalid API Response Structure';
        file_put_contents(__DIR__ . '/../debug_log.txt', date('Y-m-d H:i:s') . " Error: " . $errorMsg . "\nFull Response: " . $response . "\n", FILE_APPEND);
        throw new Exception($errorMsg);
    }

    $text = $result['candidates'][0]['content']['parts'][0]['text'];
    file_put_contents(__DIR__ . '/../debug_log.txt', date('Y-m-d H:i:s') . " Raw API Response: " . $text . "\n", FILE_APPEND);

    $text = trim($text);
    $text = preg_replace('/^```json\s*|\s*```$/', '', $text);

    $json = json_decode($text, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        $firstBrace = strpos($text, '{');
        $lastBrace = strrpos($text, '}');
        if ($firstBrace !== false && $lastBrace !== false && $lastBrace > $firstBrace) {
            $temp = substr($text, $firstBrace, $lastBrace - $firstBrace + 1);
            while (strlen($temp) > 0) {
                $testJson = json_decode($temp, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $json = $testJson;
                    break;
                }
                $nextLastBrace = strrpos(substr($temp, 0, -1), '}');
                if ($nextLastBrace === false) {
                    break;
                }
                $temp = substr($temp, 0, $nextLastBrace + 1);
            }
        }
    }

    if (!$json) {
        $errorMsg = 'Invalid JSON from Gemini: ' . json_last_error_msg();
        file_put_contents(__DIR__ . '/../debug_log.txt', date('Y-m-d H:i:s') . " Error: " . $errorMsg . "\nRaw: " . $text . "\n", FILE_APPEND);
        throw new Exception($errorMsg);
    }

    if (isset($json[0]) && is_array($json[0])) {
        $json = $json[0];
    }

    return $json;
}

// Construct the prompt
$prompt = "";
$selectedSituationText = "";
$situation = '';
$excludeList = [];
if ($type === 'new') {
    // Load situations
    $situationsFile = __DIR__ . '/../data/situations.json';
    $inputMode = $input['input_mode'] ?? 'translate';
    $japaneseInput = $input['japanese_input'] ?? '';
    
    if (!empty($japaneseInput)) {
        $selectedSituationText = $input['selected_situation'] ?? $japaneseInput;
        if ($inputMode === 'translate') {
            $situationText = "ユーザーの入力した発話内容: " . $japaneseInput;
            $specificInstruction = "ユーザーが入力した『{$japaneseInput}』という内容を、相手（AI）の最初の発話として採用してください。入力された日本語の意味を正確に保ちつつ、文脈に合わせた自然でリアリティのある英語に訳してください。勝手に状況を変えたり、質問に変換したりせず、入力された内容をそのまま伝える表現にしてください。";
        } else {
            $situationText = "ユーザーの入力した状況・意図: " . $japaneseInput;
            $specificInstruction = "ユーザーが入力した『{$japaneseInput}』という状況・意図を汲み取り、そのシーンで相手（AI）がユーザーに話しかける最初の言葉として最も自然でリアリティのある発話を生成してください。単なる直訳ではなく、その状況を具体化（場所や関係性など）して、会話が弾むような一言にしてください。";
        }
    } else {
        if (file_exists($situationsFile)) {
            $allSituations = json_decode(file_get_contents($situationsFile), true);
            if ($allSituations && is_array($allSituations)) {
                $selectedCategories = $input['situations'] ?? [];
                $excludeSituations = $input['exclude_situations'] ?? [];

                $filteredSituations = $allSituations;
                if (!empty($selectedCategories)) {
                    $filteredSituations = array_filter($allSituations, function ($s) use ($selectedCategories) {
                        return in_array($s['category'], $selectedCategories);
                    });
                    if (empty($filteredSituations)) {
                        $filteredSituations = $allSituations;
                    }
                }

                // Filter out recently played situations to avoid repeats
                if (!empty($excludeSituations)) {
                    $trulyFiltered = array_filter($filteredSituations, function ($s) use ($excludeSituations) {
                        return !in_array($s['situation'], $excludeSituations);
                    });
                    // Fallback if all situations are excluded
                    if (!empty($trulyFiltered)) {
                        $filteredSituations = $trulyFiltered;
                    }
                }

                // Reset keys to sequential index to ensure perfectly uniform random selection
                $filteredSituations = array_values($filteredSituations);

                $randomSituation = $filteredSituations[array_rand($filteredSituations)];
                $situationText = "シチュエーション: " . $randomSituation['situation'] . " (" . $randomSituation['category'] . ")";
                $selectedSituationText = $randomSituation['situation'];
            }
        }
        $specificInstruction = "指定されたシチュエーションをさらに具体的に深掘りし、そのシーンでしかあり得ないような、具体的でリアリティのある発話を生成してください。どこでも言えるような汎用的なフレーズ（例：「こんにちは」「お元気ですか」など）は避け、学習者がそのシーンの語彙を学べるような内容にしてください。また、毎回同じようなフレーズになるのを防ぐため、具体的な曜日、時間、人間関係、あるいはその状況特有の細かな背景やちょっとした出来事（例：忘れ物、時間の遅れ、特別なリクエストなど）をランダムに想定し、オリジナリティとリアリティのある発話にしてください。";
    }

    $prompt = "日常会話のロールプレイシナリオを作成してください。
    
    【現在の状況】
    {$situationText}
    
    役割定義:
    - 'japanese': 相手（AI）がユーザーに話しかける言葉です。
    - 'sample_user_japanese': それに対するユーザー（あなた）の返答例です。
    
    指示:
    - {$specificInstruction}
    - 文字数は{$length}文字程度にしてください。
    - 1人の発話のみを含めてください。複数人の会話形式にはしないでください。
    - 生成する英語は、以下の基準に従ってください:
      **{$currentLevelInst}**
    - シーンの説明や話者名を含めないでください。
    - 「もちろんです」などの前置きは一切不要です。
    - 純粋な会話文のみを出力してください。
    - 文脈から上下関係や役割が明確になるようにしてください（例：上司と部下、店員と客など）。
    
    出力はJSON形式で、以下のキーを含めてください:
      - 'japanese': 生成した日本語の会話文（相手の発話）
      - 'english': その英訳
      - 'sample_user_answers': ユーザーの返答例のリスト（1〜5個程度）。提案数は固定せず、文脈に応じてできるだけ多くのバリエーションを提示してください。ただし、似たような表現ばかりを並めるのは避け、ポジティブ・ネガティブ・質問など様々な視点で提示してください。各要素は 'ja' (日本語) と 'en' (英語) のキーを持つオブジェクトにしてください。";
} elseif ($type === 'situation_options') {
    $situation = $input['situation'] ?? '';
    
    if (empty($situation)) {
        $situationsFile = __DIR__ . '/../data/situations.json';
        if (file_exists($situationsFile)) {
            $allSituations = json_decode(file_get_contents($situationsFile), true);
            if ($allSituations && is_array($allSituations)) {
                $selectedCategories = $input['situations'] ?? [];
                $excludeSituations = $input['exclude_situations'] ?? [];

                $filteredSituations = $allSituations;
                if (!empty($selectedCategories)) {
                    $filteredSituations = array_filter($allSituations, function ($s) use ($selectedCategories) {
                        return in_array($s['category'], $selectedCategories);
                    });
                    if (empty($filteredSituations)) {
                        $filteredSituations = $allSituations;
                    }
                }

                if (!empty($excludeSituations)) {
                    $trulyFiltered = array_filter($filteredSituations, function ($s) use ($excludeSituations) {
                        return !in_array($s['situation'], $excludeSituations);
                    });
                    if (!empty($trulyFiltered)) {
                        $filteredSituations = $trulyFiltered;
                    }
                }

                $filteredSituations = array_values($filteredSituations);
                $randomSituation = $filteredSituations[array_rand($filteredSituations)];
                $situation = $randomSituation['situation'];
            }
        }
    }

    $excludeList = $input['exclude'] ?? [];
    $prompt = buildSituationOptionsPrompt($situation, $excludeList, 10, 1, $length);
} elseif ($type === 'question') {
    $history = implode("\n", array_map(function ($item) {
        $role = $item['role'] === 'user' ? 'ユーザー' : 'AI';
        return "{$role}: " . $item['text'];
    }, $input['context']['history'] ?? []));

    $situation = $input['context']['situation'] ?: 'なし';
    $userInput = $input['context']['user_input'] ?: 'なし';
    $correction = $input['context']['correction'] ?: 'なし';
    $englishText = $input['context']['english'] ?: '';

    $prompt = "あなたは英語学習のアシスタントAIです。ユーザーからの質問に答えてください。
    
    前提となる会話コンテキスト:
    【対象の英文】: {$englishText}
    【状況/問いかけ】: {$situation}
    【ユーザーの回答】: {$userInput}
    【AIによる添削】: {$correction}
    
    これまでのQ&A履歴:
    {$history}
    
    ユーザーの質問:
    {$input['text']}
    
    指示:
    - 上記の「前提となる会話コンテキスト」を踏まえて、ユーザーの質問に答えててください。
    - 質問が「対象の英文」に関するものであれば、文法、語彙、ニュアンス、使い方などについて分かりやすく解説してください。
    - 質問が「AIによる添削」に関するものであれば、なぜそのように修正されたのかを解説してください。
    - 日本語での回答は、以下のスタイルを守ってください:
      **{$currentStyleInst}**
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

    $excludeList = $input['context']['exclude'] ?? [];
    $excludeInstruction = !empty($excludeList) ? "\n以下の表現は既に提示済みのため、これらとは**異なる**別の自然な言い回しを考えてください:\n- " . implode("\n- ", $excludeList) : "";

    $prompt = "以下の会話フレーズの「別バリエーション」を生成してください。
    
    元のフレーズ:
    日本語: {$originalJapanese}
    英語: {$originalEnglish}
    {$excludeInstruction}
    
    指示:
    - 元のフレーズと同じ意味・意図を持ちつつ、異なる言い回しや表現を考えてください。
    - **{$randomStyle}**
    - 元のフレーズや既に出された上記のリストが既に自然な場合でも、必ず別の自然な言い方を提示してください。
    - 文字数は元のフレーズと同程度にしてください。
    - 解説（point）は、以下のスタイルで記述してください:
      **{$currentStyleInst}**
    - 出力はJSON形式で、以下のキーを含めてください:
      - 'japanese': 生成した日本語の会話文（相手の発話）
      - 'english': その英訳
      - 'sample_user_answers': ユーザーの返答例のリスト（1〜5個程度）。提案数は固定せず、文脈に応じてできるだけ多くのバリエーションを提示してください。ただし、似たような表現ばかりを並べるのは避け、明確に異なる表現を提示してください。各要素は 'ja' (日本語) と 'en' (英語) のキーを持つオブジェクトにしてください。
      - 'point': このバリエーションのポイントや特徴の簡潔な解説（例：「より丁寧な表現にしました」「〇〇というイディオムを使いました」など）";
} elseif ($type === 'native') {
    $originalJapanese = $input['context']['japanese'] ?? '';
    $originalEnglish = $input['context']['english'] ?? '';

    $excludeList = $input['context']['exclude'] ?? [];
    $excludeInstruction = !empty($excludeList) ? "\n以下の表現は既に提示済みのため、これらとは**異なる**自然なネイティブ表現を使用してください:\n- " . implode("\n- ", $excludeList) : "";

    $prompt = "以下の会話フレーズを「現地で使われる自然なネイティブの表現」に書き換えてください。
    
    元のフレーズ:
    日本語: {$originalJapanese}
    英語: {$originalEnglish}
    {$excludeInstruction}
    
    指示:
    - 文法的に正しいかよりも、実際の現地の日常会話で使われるような、自然でこなれた表現にしてください。
    - ロボットのような教科書的な硬い文章は避け、省略形、句動詞、自然な繋ぎ言葉などを適宜使用してください。
    - 既に提示された上記のリストとは異なる、別の自然な言い回しを検討してください。
    - 解説（point）は、以下のスタイルで記述してください:
      **{$currentStyleInst}**
    - 出力はJSON形式で、以下のキーを含めてください:
      - 'japanese': 生成した日本語の会話文（元の意味に近い、自然な日本語）
      - 'english': その自然な英訳
      - 'sample_user_answers': ユーザーの回答例のリスト（1〜5個程度）。提案数は固定せず、文脈に応じてできるだけ多くのバリエーションを提示してください。各要素は 'ja' (日本語) と 'en' (英語) のキーを持つオブジェクトにしてください。
      - 'point': どの部分がネイティブらしいのか、どのようなニュアンスが含まれているかの解説";
} elseif ($type === 'simple') {
    $originalJapanese = $input['context']['japanese'] ?? '';
    $originalEnglish = $input['context']['english'] ?? '';

    $excludeList = $input['context']['exclude'] ?? [];
    $excludeInstruction = !empty($excludeList) ? "\n以下の表現は既に提示済みのため、これらとは**異なる**簡単な表現を使用してください:\n- " . implode("\n- ", $excludeList) : "";

    $prompt = "以下の会話フレーズを「簡単な英語（中学生レベル）」に書き換えてください。
    
    元のフレーズ:
    日本語: {$originalJapanese}
    英語: {$originalEnglish}
    {$excludeInstruction}
    
    指示:
    - 元のフレーズと同じ意味・意図を保ちつつ、中学生で習うような基本的な単語や文法を使って表現してください。
    - 既に提示された上記のリストとは異なる言い回しを積極的に探してください。
    - 難しいイディオムや構文は避けてください。
    - 解説（point）は、以下のスタイルで記述してください:
      **{$currentStyleInst}**
    - 出力はJSON形式で、以下のキーを含めてください:
      - 'japanese': 生成した日本語の会話文（元の意味に近い、自然な日本語）
      - 'english': その簡単な英訳
      - 'sample_user_answers': ユーザーの回答例のリスト（1〜5個程度）。提案数は固定せず、文脈に応じてできるだけ多くのバリエーションを提示してください。各要素は 'ja' (日本語) と 'en' (英語) のキーを持つオブジェクトにしてください。
      - 'point': どのように簡単にしたかの解説（例：「難しい単語〇〇を簡単な〇〇に言い換えました」など）";
} elseif ($type === 'formal') {
    $originalJapanese = $input['context']['japanese'] ?? '';
    $originalEnglish = $input['context']['english'] ?? '';

    $excludeList = $input['context']['exclude'] ?? [];
    $excludeInstruction = !empty($excludeList) ? "\n以下の表現は既に提示済みのため、これらとは**異なる**自然で丁寧な表現を使用してください:\n- " . implode("\n- ", $excludeList) : "";

    $prompt = "以下の会話フレーズを「フォーマル・丁寧な表現」に書き換えてください。
    
    元のフレーズ:
    日本語: {$originalJapanese}
    英語: {$originalEnglish}
    {$excludeInstruction}
    
    指示:
    - ビジネスシーンや目上の人に対して使えるような、丁寧で礼儀正しい表現にしてください。
    - 既に提示された上記のリストとは異なる、別の語彙や構成を検討してください。
    - 解説（point）は、以下のスタイルで記述してください:
      **{$currentStyleInst}**
    - 出力はJSON形式で、以下のキーを含めてください:
      - 'japanese': 生成した日本語の会話文
      - 'english': その英訳
      - 'sample_user_answers': ユーザーの回答例のリスト（1〜5個程度）。提案数は固定せず、文脈に応じてできるだけ多くのバリエーションを提示してください。各要素は 'ja' (日本語) と 'en' (英語) のキーを持つオブジェクトにしてください。
      - 'point': どの部分がフォーマルなのかの解説（例：「〇〇という丁寧な表現を使いました」など）";
} elseif ($type === 'casual') {
    $originalJapanese = $input['context']['japanese'] ?? '';
    $originalEnglish = $input['context']['english'] ?? '';

    $excludeList = $input['context']['exclude'] ?? [];
    $excludeInstruction = !empty($excludeList) ? "\n以下の表現は既に提示済みのため、これらとは**異なる**カジュアルな表現を使用してください:\n- " . implode("\n- ", $excludeList) : "";

    $prompt = "以下の会話フレーズを「カジュアル・親しい間柄の表現」に書き換えてください。
    
    元のフレーズ:
    日本語: {$originalJapanese}
    英語: {$originalEnglish}
    {$excludeInstruction}
    
    指示:
    - 友人や家族など、親しい間柄で使うような砕けた表現やスラングを含めた自然な表現にしてください。
    - 既に提示された上記のリストとは異なる、別のスラングや短縮形、口語表現を検討してください。
    - 解説（point）は、以下のスタイルで記述してください:
      **{$currentStyleInst}**
    - 出力はJSON形式で、以下のキーを含めてください:
      - 'japanese': 生成した日本語の会話文
      - 'english': その英訳
      - 'sample_user_answers': ユーザーの回答例のリスト（1〜5個程度）。提案数は固定せず、文脈に応じてできるだけ多くのバリエーションを提示してください。各要素は 'ja' (日本語) と 'en' (英語) のキーを持つオブジェクトにしてください。
      - 'point': どの部分がカジュアルなのかの解説（例：「スラングの〇〇を使いました」「短縮形を使いました」など）";
} else {
    $history = implode("\n", array_map(function ($item) {
        if (isset($item['role']) && $item['role'] === 'user') {
            return "あなた(ユーザー): " . $item['text'];
        } else {
            return "相手: " . ($item['japanese'] ?? '');
        }
    }, $context));

    // Extract recent conversation texts to prevent repetition
    $recentTexts = array_slice(array_map(function ($item) {
        return $item['japanese'] ?? '';
    }, array_filter($context, function ($item) {
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
    - 生成する英語は、以下の基準に従ってください:
      **{$currentLevelInst}**
    - シーンの説明や話者名を含めないでください。
    - 「もちろんです」などの前置きは一切不要です。
    - 純粋な会話文のみを出力してください。
    - 出力はJSON形式で、以下のキーを含めてください:
      - 'japanese': 生成した日本語の会話文(相手の発話)
      - 'english': その英訳
      - 'sample_user_answers': ユーザーの回答例のリスト（1〜5個程度）。提案数は固定せず、文脈に応じてできるだけ多くのバリエーションを提示してください。ただし、似たような表現ばかりを並べるのは避け、ポジティブ・ネガティブ・質問など様々な視点で提示してください。各要素は 'ja' (日本語) と 'en' (英語) のキーを持つオブジェクトにしてください。";
}

try {
    $json = callGeminiJson($prompt);

    if ($type === 'situation_options') {
        $allCandidates = dedupeSituationOptions($json['options'] ?? [], $excludeList);
        $options = dedupeSituationOptions(
            filterSituationOptionsByLength($allCandidates, $length, 1),
            $excludeList
        );

        for ($attempt = 2; count($options) < 10 && $attempt <= 6; $attempt++) {
            $retryPrompt = buildSituationOptionsPrompt($situation, array_merge($excludeList, $options), 10, $attempt, $length);
            $retryJson = callGeminiJson($retryPrompt);
            $retryCandidates = dedupeSituationOptions($retryJson['options'] ?? [], array_merge($excludeList, $allCandidates));
            $allCandidates = dedupeSituationOptions(array_merge($allCandidates, $retryCandidates), $excludeList);
            $lengthMatchedOptions = filterSituationOptionsByLength($retryCandidates, $length, $attempt);
            $options = dedupeSituationOptions(array_merge($options, $lengthMatchedOptions), $excludeList);
        }

        for ($attempt = 1; count($options) < 10 && $attempt <= 3; $attempt++) {
            $seedOptions = array_slice(
                sortSituationOptionsByLengthCloseness(
                    array_values(array_diff($allCandidates, $options)),
                    $length
                ),
                0,
                12
            );

            if (empty($seedOptions)) {
                break;
            }

            $rewritePrompt = buildSituationOptionsRewritePrompt(
                $situation,
                $seedOptions,
                array_merge($excludeList, $options),
                10 - count($options),
                $attempt,
                $length
            );
            $rewriteJson = callGeminiJson($rewritePrompt);
            $rewrittenCandidates = dedupeSituationOptions($rewriteJson['options'] ?? [], array_merge($excludeList, $allCandidates, $options));
            $allCandidates = dedupeSituationOptions(array_merge($allCandidates, $rewrittenCandidates), $excludeList);
            $lengthMatchedRewriteOptions = filterSituationOptionsByLength($rewrittenCandidates, $length, $attempt + 1);
            $options = dedupeSituationOptions(array_merge($options, $lengthMatchedRewriteOptions), $excludeList);
        }

        if (count($options) < 10) {
            $closestOptions = sortSituationOptionsByLengthCloseness(
                array_values(array_diff($allCandidates, $options)),
                $length
            );
            $options = dedupeSituationOptions(
                array_merge($options, array_slice($closestOptions, 0, 10 - count($options))),
                $excludeList
            );
        }

        if (empty($options)) {
            $errorMsg = 'No situation options generated';
            file_put_contents(__DIR__ . '/../debug_log.txt', date('Y-m-d H:i:s') . " Error: " . $errorMsg . "\nData: " . print_r($json, true) . "\n", FILE_APPEND);
            http_response_code(500);
            echo json_encode(['error' => $errorMsg, 'data' => $json]);
            exit;
        }

        echo json_encode([
            'situation' => $situation,
            'options' => array_slice($options, 0, 10)
        ]);
        exit;
    }

    // Validation based on expected keys
    if (isset($json['answer'])) {
        if (empty($json['answer'])) {
            $errorMsg = 'Empty answer from Gemini';
            file_put_contents(__DIR__ . '/../debug_log.txt', date('Y-m-d H:i:s') . " Error: " . $errorMsg . "\nData: " . print_r($json, true) . "\n", FILE_APPEND);
            http_response_code(500);
            echo json_encode(['error' => $errorMsg, 'data' => $json]);
            exit;
        }
    } else {
        if (empty($json['japanese']) || empty($json['english'])) {
            $errorMsg = 'Incomplete data from Gemini';
            file_put_contents(__DIR__ . '/../debug_log.txt', date('Y-m-d H:i:s') . " Error: " . $errorMsg . "\nData: " . print_r($json, true) . "\n", FILE_APPEND);
            http_response_code(500);
            echo json_encode(['error' => $errorMsg, 'data' => $json]);
            exit;
        }
    }

    if (!isset($json['sample_user_answers'])) {
        $json['sample_user_answers'] = [];
    }
    if (!isset($json['sample_user_japanese']) && !empty($json['sample_user_answers'])) {
        $json['sample_user_japanese'] = $json['sample_user_answers'][0];
    }

    if (!empty($selectedSituationText)) {
        $json['selected_situation'] = $selectedSituationText;
    }

    echo json_encode($json);
} catch (Exception $e) {
    $errorMsg = 'An unexpected error occurred: ' . $e->getMessage();
    file_put_contents(__DIR__ . '/../debug_log.txt', date('Y-m-d H:i:s') . " Exception: " . $errorMsg . "\nTrace: " . $e->getTraceAsString() . "\n", FILE_APPEND);
    http_response_code(500);
    echo json_encode(['error' => $errorMsg]);
}

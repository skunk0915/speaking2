<?php
require_once __DIR__ . '/../config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$user_input = $input['user_input'] ?? '';
$intended_japanese = $input['intended_japanese'] ?? '';
$context = $input['context'] ?? ''; // The Japanese prompt or previous conversation context
$aiStyle = $input['ai_style'] ?? 'polite';
$englishLevel = $input['english_level'] ?? 'simple';
$retry_history = $input['retry_history'] ?? [];
$mode = $input['mode'] ?? 'conversation';
$is_retry = $input['is_retry'] ?? false;

$intendedJpText = "";
if (!empty($intended_japanese)) {
    $intendedJpText = "\n### ユーザーがこの英文で伝えようとした日本語の意図:\n{$intended_japanese}\n";
}

$styleInstructions = [
    'polite' => "丁寧な「ですます調」で回答・解説してください。",
    'friendly' => "親しみ友達のような、タメ口でフレンドリーな口調で回答・解説してください。",
    'jk' => "女子高生のような口調（例：「〜だね！」「マジで」「うける」など）で、明るくフレンドリーに回答・解説してください。ただし、過度な褒め言葉や持ち上げすぎ（例：「天才じゃん！」など）は避け、建設的なアドバイスを重視してください。"
];

$levelInstructions = [
    'native' => "文法的な正確さよりも、現地のネイティブが日常会話で実際に使う『生きた表現』を優先してください。教科書的な硬い表現は避け、省略形や口語的な繋ぎ、自然なリズムを重視した、人間味のある日常表現を提案してください。",
    'formal' => "ビジネスや正式な場で使われる、丁寧でフォーマルな表現を提案してください。",
    'casual' => "友人同士で使うような、カジュアルで親しみやすい表現を提案してください。",
    'simple' => "基本的で簡単な単語や文法（中学生レベル）を使用した、分かりやすい表現を提案してください。"
];

$currentStyleInst = $styleInstructions[$aiStyle] ?? $styleInstructions['polite'];
$currentLevelInst = $levelInstructions[$englishLevel] ?? $levelInstructions['native'];

$suggested_sentences = $input['suggested_sentences'] ?? [];

$suggestedSentencesText = "";
if (!empty($suggested_sentences)) {
    $suggestedSentencesText = "\n### すでにユーザーに提示済みの英文例:\n- " . implode("\n- ", $suggested_sentences) . "\n";
}

if (empty($user_input)) {
    http_response_code(400);
    echo json_encode(['error' => 'User input is required']);
    exit;
}

// Format retry history for the prompt
$historyText = "";
if (!empty($retry_history)) {
    $historyText = "\n### これまでの試行履歴:\n";
    foreach ($retry_history as $index => $item) {
        $num = $index + 1;
        $historyText .= "--- 試行 {$num} ---\n";
        $historyText .= "回答: " . ($item['user_input'] ?? '') . "\n";
        $historyText .= "添削: " . ($item['correction'] ?? '') . "\n";
    }
    $historyText .= "\n今回の回答は、上記の履歴（特に前回の添削内容）を踏まえて、ユーザーが改善できているか、または同じ間違いを繰り返していないかを含めて添削してください。\n";
}

if ($mode === 'translation') {
    $prompt = "
    あなたは英語の先生です。
    相手（あなた）は、以下の「日本語の原文」を英語に翻訳しようとしています。
    あなたの翻訳（「あなたの英語」）を添削してください。
";
    if (!$is_retry) {
        $prompt .= "さらに、以下の基準に従った自然な提案例を3つ作成してください:\n**{$currentLevelInst}**
";
    }

    $prompt .= "

    重要：
    - これは「会話の返答」ではなく「翻訳」の練習です。あなたが原文の主語（私、あなた、彼など）を正しく捉えているか確認してください。
    - あなたの英語が文法的に正しく、意味が通じる場合は、内容に対する指摘はしないでください。
    - 「もっと具体的に言ったほうが親切です」といったアドバイスは不要です。あくまで「英語として正しいか」「自然な響きか」に焦点を当ててください。
    - ただし、文法ミスや、ネイティブが聞いて違和感を感じる不自然な表現、または意味が誤解される表現については指摘してください。
    - **「伝わるか」の観点でも必ず評価してください。** 文法が不正確でも、ネイティブが聞いて「言いたいことはわかる」と判断できる場合は「文法的には誤りがあるが意味は通じる」と評価してください。一方、単語の羅列やキーワード不足によって「何を伝えたいのかが読み取れない」レベルの場合は、それを文法的な指摘より優先して指摘してください。
    - 履歴がある場合は、その内容を踏まえて、あなたの進歩や改善点を評価・指摘してください。
    - **重要：もしあなたの英語が、下記の「すでに提示済みの英文例」のいずれかと一致、またはほぼ同じである場合は、それを『間違い』として指摘してはいけません。100%正解として扱ってください。**
    - もし提示済みの英文よりもさらに良い、または異なるニュアンスの表現を提案したい場合は、「間違いの指摘」ではなく「さらなるブラッシュアップ案」や「別のバリエーション」としてポジティブに提案してください。
";

    if ($is_retry) {
        $prompt .= "
    - **再挑戦（Retry）モードです。** 以前の添削内容を踏まえて、あなたがどのように改善したか、または以前の指摘が反映されているかを重点的にコメントしてください。
    - 提案英文（suggestions）は不要です。空の配列を返してください。
";
    }

    $prompt .= "
    指示:
    - 添削コメントや各提案の解説（point）は、以下のスタイルを守って日本語で記述してください:
      **{$currentStyleInst}**
    - **重要：マークダウン形式（太字、箇条書き、適度な改行など）を適切に使用して、読みやすく視認性の高い添削を行ってください。特に、異なる話題や複数の指摘がある場合は、空行（ダブル改行）を入れて段落を分けてください。**
    - 「素晴らしいです」などの無駄な褒め言葉は一切不要です。
    - 間違いがある場合は、どこがどう間違っているのか、なぜその表現が不自然なのかを具体的に解説してください。
    - あなたの英語が完璧な場合は、「自然で正しい英語です」とのみ伝えてください。
    - **重要：添削コメントの最後（文末）には、今回の添削やアドバイスの要点を、2〜3項目のMarkdown形式のリスト（「- 」を使用）で簡潔にまとめて追加してください。まとめの前には必ず空行を入れ、見出しなどは付けずに直接リストを始めてください。**

";

    if (!$is_retry) {
        $prompt .= "
    - 自然な表現の提案例（suggestions）を、1〜5個程度作成してください。
    - 提案数は固定せず、文脈や表現の幅広さに応じて、できるだけ多くのバリエーションを提示してください。ただし、似たような表現ばかりを並めるのは避け、それぞれが明確に異なる（丁寧さ、カジュアルさ、イディオムの違いなど）ようにしてください。
    - 各提案には、日本語訳と、なぜその表現が良いのか（またはどういうニュアンスなのか）の解説（ポイント）を付けてください。
";
    }

    $prompt .= "
    日本語の原文:
    {$context}
    {$intendedJpText}
    {$suggestedSentencesText}
    {$historyText}
    あなたの今回の英語:
    {$user_input}

    出力形式（JSONのみ）:
    {
        \"correction\": \"添削コメント（日本語）。提示済みの英文が使われた場合は間違いとして指摘せず、必要に応じてブラッシュアップ案として記述すること。履歴がある場合はそれらを踏まえた内容にすること。無駄な褒め言葉は省略し、解説を重視すること。最後に簡潔な箇条書きのまとめを含めること。\",
        \"suggestions\": " . ($is_retry ? "[]" : "[
            {
                \"english\": \"自然な表現1 (英語)\",
                \"japanese\": \"その日本語訳\",
                \"point\": \"解説\"
            },
            ... (必要な数だけ作成)
        ]") . "
    }
    ";
} else {
    // Default Conversation Mode
    $prompt = "
    あなたは英語の先生です。
    以下の「状況/問いかけ」は、あなたに対して投げかけられた言葉（または状況）です。
    それに対して、あなたが「あなたの回答」として英語で返答しました。
    あなたの英語を添削してください。
";
    if (!$is_retry) {
        $prompt .= "さらに、以下の基準に従った自然な提案例を3つ作成してください:\n**{$currentLevelInst}**
";
    }

    $prompt .= "

    重要：
    - 文脈（状況/問いかけ）から、あなたの立場（役割）を正しく理解してください。
    - あなたの英語が文法的に正しく、意味が通じる場合は、内容（親切さや具体性など）に対する指摘は絶対にしないでください。
    - 「もっと具体的に言ったほうが親切です」といったアドバイスは不要です。あくまで「英語として正しいか」「自然な響きか」に焦点を当ててください。
    - ただし、文法ミスや、ネイティブが聞いて違和感を感じる不自然な表現、または意味が誤解される表現については指摘してください。
    - **「伝わるか」の観点でも必ず評価してください。** 文法が不正確でも、ネイティブが聞いて「言いたいことはわかる」と判断できる場合は「文法的には誤りがあるが意味は通じる」と評価してください。一方、単語の羅列やキーワード不足によって「何を伝えたいのかが読み取れない」レベルの場合は、それを文法的な指摘より優先して指摘してください。
    - 履歴がある場合は、その内容を踏まえて、あなたの進歩や改善点を評価・指摘してください。
    - **重要：もしあなたの英語が、下記の「すでに提示済みの英文例」のいずれかと一致、またはほぼ同じである場合は、それを『間違い』として指摘してはいけません。100%正解として扱ってください。**
    - もし提示済みの英文よりもさらに良い、または異なるニュアンスの表現を提案したい場合は、「間違いの指摘」ではなく「さらなるブラッシュアップ案」や「別のバリエーション」としてポジティブに提案してください。
";

    if ($is_retry) {
        $prompt .= "
    - **再挑戦（Retry）モードです。** 以前の添削内容を踏まえて、あなたがどのように改善したか、または以前の指摘が反映されているかを重点的にコメントしてください。
    - 提案英文（suggestions）は不要です。空の配列を返してください。
";
    }

    $prompt .= "
    指示:
    - 添削コメントや各提案の解説（point）は、以下のスタイルを守って日本語で記述してください:
      **{$currentStyleInst}**
    - **重要：マークダウン形式（太字、箇条書き、適度な改行など）を適切に使用して、読みやすく視認性の高い添削を行ってください。特に、異なる話題や複数の指摘がある場合は、空行（ダブル改行）を入れて段落を分けてください。**
    - 「素晴らしいです」などの無駄な褒め言葉は一切不要です。
    - 間違いがある場合は、どこがどう間違っているのか、なぜその表現が不自然なのかを具体的に解説してください。
    - あなたの英語が完璧な場合は、「自然で正しい英語です」とのみ伝えてください。
    - **重要：添削コメントの最後（文末）には、今回の添削やアドバイスの要点を、2〜3項目のMarkdown形式のリスト（「- 」を使用）で簡潔にまとめて追加してください。まとめの前には必ず空行を入れ、見出しなどは付けずに直接リストを始めてください。**

";

    if (!$is_retry) {
        $prompt .= "
    - 自然な表現の提案例（suggestions）を、1〜5個程度作成してください。
    - 提案数は固定せず、文脈や表現の幅広さに応じて、できるだけ多くのバリエーションを提示してください。ただし、似たような表現ばかりを並めるのは避け、それぞれが明確に異なる（丁寧さ、カジュアルさ、イディオムの違いなど）ようにしてください。
    - 各提案には、日本語訳と、なぜその表現が良いのか（またはどういうニュアンスなのか）の解説（ポイント）を付けてください。
";
    }

    $prompt .= "
    状況/問いかけ（相手の発話）:
    {$context}
    {$intendedJpText}
    {$suggestedSentencesText}
    {$historyText}
    あなたの今回の回答:
    {$user_input}

    出力形式（JSONのみ）:
    {
        \"correction\": \"添削コメント（日本語）。提示済みの英文が使われた場合は間違いとして指摘せず、必要に応じてブラッシュアップ案として記述すること。履歴がある場合はそれらを踏まえた内容にすること。無駄な褒め言葉は省略し、解説を重視すること。文脈に合わない場合はその旨を指摘。最後に簡潔な箇条書きのまとめを含めること。\",
        \"suggestions\": " . ($is_retry ? "[]" : "[
            {
                \"english\": \"自然な表現1 (英語)\",
                \"japanese\": \"その日本語訳\",
                \"point\": \"解説\"
            },
            ... (必要な数だけ作成)
        ]") . "
    }
    ";
}

// Call Gemini API
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
    http_response_code(500);
    $errorMsg = 'API Request Failed with HTTP Code: ' . $httpCode;
    file_put_contents(__DIR__ . '/../debug_log.txt', date('Y-m-d H:i:s') . " Error: " . $errorMsg . "\nDetails: " . $response . "\n", FILE_APPEND);
    echo json_encode(['error' => $errorMsg]);
    exit;
}

try {
    $result = json_decode($response, true);
    if (isset($result['candidates'][0]['content']['parts'][0]['text'])) {
        $text = $result['candidates'][0]['content']['parts'][0]['text'];

        // Strip markdown code blocks if present
        $text = preg_replace('/^```json\s*|\s*```$/', '', $text);

        $json = json_decode($text, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            // Fallback if JSON parsing fails
            throw new Exception('Invalid JSON from Gemini: ' . json_last_error_msg());
        }

        // Handle array wrapper if present
        if (isset($json[0]) && is_array($json[0])) {
            $json = $json[0];
        }

        echo json_encode($json);
    } else {
        throw new Exception('Invalid API Response Structure');
    }
} catch (Exception $e) {
    $errorMsg = 'Error processing Gemini response: ' . $e->getMessage();
    file_put_contents(__DIR__ . '/../debug_log.txt', date('Y-m-d H:i:s') . " Error: " . $errorMsg . "\nRaw: " . $response . "\n", FILE_APPEND);
    http_response_code(500);
    echo json_encode(['error' => $errorMsg]);
}

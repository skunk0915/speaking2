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
$context = $input['context'] ?? ''; // The Japanese prompt or previous conversation context

if (empty($user_input)) {
    http_response_code(400);
    echo json_encode(['error' => 'User input is required']);
    exit;
}

// Construct the prompt for Gemini
$prompt = "
あなたは英語の先生です。
以下の「状況/問いかけ」は、ユーザーに対して投げかけられた言葉（または状況）です。
それに対して、ユーザーが「ユーザーの回答」として英語で返答しました。
ユーザーの英語を添削し、さらに自然なネイティブの表現を3つ提案してください。

重要：
- 文脈（状況/問いかけ）から、ユーザーの立場（役割）を正しく理解してください。
- ユーザーの英語が文法的に正しく、意味が通じる場合は、内容（親切さや具体性など）に対する指摘は絶対にしないでください。
- 「もっと具体的に言ったほうが親切です」といったアドバイスは不要です。あくまで「英語として正しいか」「自然な響きか」に焦点を当ててください。
- ただし、文法ミスや、ネイティブが聞いて違和感を感じる不自然な表現、または意味が誤解される表現については指摘してください。

指示:
- 添削コメントは日本語で記述してください。
- 「素晴らしいです」などの無駄な褒め言葉は一切不要です。
- 間違いがある場合は、どこがどう間違っているのか、なぜその表現が不自然なのかを具体的に解説してください。
- ユーザーの英語が完璧な場合は、「自然で正しい英語です」とのみ伝えてください。
- 提案する3つの表現は、ユーザーの意図を汲み取った上で、ネイティブが使う自然な表現にしてください。
- 各提案には、日本語訳と、なぜその表現が良いのか（またはどういうニュアンスなのか）の解説（ポイント）を付けてください。

状況/問いかけ（相手の発話）:
{$context}

ユーザーの回答:
{$user_input}

出力形式（JSONのみ）:
{
    \"correction\": \"添削コメント（日本語）。無駄な褒め言葉は省略し、解説を重視すること。文脈に合わない場合はその旨を指摘。\",
    \"suggestions\": [
        {
            \"english\": \"自然な表現1 (英語)\",
            \"japanese\": \"その日本語訳\",
            \"point\": \"なぜこの表現が良いのか、ニュアンスの解説\"
        },
        {
            \"english\": \"自然な表現2 (英語)\",
            \"japanese\": \"その日本語訳\",
            \"point\": \"解説\"
        },
        {
            \"english\": \"自然な表現3 (英語)\",
            \"japanese\": \"その日本語訳\",
            \"point\": \"解説\"
        }
    ]
}
";

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

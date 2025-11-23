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

    $prompt = "日常会話の文章を日本語で生成してください。
    {$situationText}
    - 文字数は{$length}文字程度にしてください。
    - 1人の発話のみを含めてください。複数人の会話形式にはしないでください。
    - シーンの説明や話者名を含めないでください。
    - 「もちろんです」などの前置きは一切不要です。
    - 純粋な会話文のみを出力してください。
    - 出力はJSON形式で、キーは 'japanese' と 'english' (英訳) にしてください。";
} else {
    $history = implode("\n", array_map(function($item) {
        return $item['japanese'];
    }, $context));
    
    $prompt = "以下の会話の文脈に続く、自然な日本語の返答を生成してください。
    
    これまでの会話:
    {$history}
    
    指示:
    - 文字数は{$length}文字程度にしてください。
    - 1人の発話のみを含めてください。
    - シーンの説明や話者名を含めないでください。
    - 「もちろんです」などの前置きは一切不要です。
    - 純粋な会話文のみを出力してください。
    - 出力はJSON形式で、キーは 'japanese' と 'english' (英訳) にしてください。";
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
        
        if (empty($json['japanese']) || empty($json['english'])) {
            $errorMsg = 'Incomplete data from Gemini';
            file_put_contents(__DIR__ . '/../debug_log.txt', date('Y-m-d H:i:s') . " Error: " . $errorMsg . "\nData: " . print_r($json, true) . "\n", FILE_APPEND);

            http_response_code(500);
            echo json_encode(['error' => $errorMsg, 'data' => $json]);
            exit;
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

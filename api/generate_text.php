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
    $prompt = "日常会話の文章を日本語で生成してください。
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
    echo json_encode(['error' => 'API Error', 'details' => $response]);
    exit;
}

$result = json_decode($response, true);
if (isset($result['candidates'][0]['content']['parts'][0]['text'])) {
    $text = $result['candidates'][0]['content']['parts'][0]['text'];
    echo $text; // Already JSON
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Invalid API Response']);
}

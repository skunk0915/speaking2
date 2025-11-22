<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../db/db.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$text = $input['text'] ?? '';
$voice = $input['voice'] ?? 'en-US-Journey-F'; // Default voice
$speed = $input['speed'] ?? 1.0;

if (empty($text)) {
    http_response_code(400);
    echo json_encode(['error' => 'Text is required']);
    exit;
}

// Generate hash for caching
$textHash = hash('sha256', $text);

// Check cache
try {
    $stmt = $pdo->prepare("SELECT file_path FROM audio_cache WHERE text_hash = ? AND voice_name = ? AND speed = ?");
    $stmt->execute([$textHash, $voice, $speed]);
    $cached = $stmt->fetch();

    if ($cached) {
        echo json_encode(['audio_url' => AUDIO_URL . $cached['file_path'], 'cached' => true]);
        exit;
    }
} catch (PDOException $e) {
    // Continue to generation if DB fails (or handle error)
}

// Call Google TTS API
$url = "https://texttospeech.googleapis.com/v1/text:synthesize?key=" . GOOGLE_TTS_API_KEY;

$data = [
    'input' => ['text' => $text],
    'voice' => ['languageCode' => 'en-US', 'name' => $voice],
    'audioConfig' => ['audioEncoding' => 'MP3', 'speakingRate' => $speed]
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
    echo json_encode(['error' => 'TTS API Error', 'details' => $response]);
    exit;
}

$result = json_decode($response, true);
if (isset($result['audioContent'])) {
    $audioData = base64_decode($result['audioContent']);
    $fileName = $textHash . '_' . $voice . '_' . str_replace('.', '-', $speed) . '.mp3';
    $filePath = AUDIO_DIR . $fileName;

    if (file_put_contents($filePath, $audioData)) {
        // Save to DB
        try {
            $stmt = $pdo->prepare("INSERT INTO audio_cache (text_hash, text_content, voice_name, speed, file_path) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$textHash, $text, $voice, $speed, $fileName]);
        } catch (PDOException $e) {
            // Log error but continue
        }

        echo json_encode(['audio_url' => AUDIO_URL . $fileName, 'cached' => false]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save audio file']);
    }
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Invalid TTS Response']);
}

<?php
ini_set('display_errors', 0); // Disable auto-display of errors to prevent breaking JSON
error_reporting(E_ALL);

function log_debug($message)
{
    $logFile = __DIR__ . '/../debug_log.txt';
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] [SPEECH] $message\n", FILE_APPEND);
}

function cleanup_old_audio_files($pdo)
{
    $maxLimit = 1 * 1024 * 1024 * 1024; // 1GB
    $audioDir = defined('AUDIO_DIR') ? AUDIO_DIR : __DIR__ . '/../audio/';
    
    try {
        $stmt = $pdo->query("SELECT SUM(file_size) as total_size FROM audio_cache");
        $row = $stmt->fetch();
        $totalSize = (int)($row['total_size'] ?? 0);
        
        log_debug("Current total audio cache size: $totalSize bytes (Limit: $maxLimit bytes)");
        
        if ($totalSize > $maxLimit) {
            $bytesToDelete = $totalSize - $maxLimit;
            log_debug("Need to delete at least $bytesToDelete bytes");
            
            $deletedBytes = 0;
            
            while ($deletedBytes < $bytesToDelete) {
                $stmt = $pdo->query("SELECT id, file_path, file_size FROM audio_cache ORDER BY created_at ASC, id ASC LIMIT 100");
                $records = $stmt->fetchAll();
                
                if (empty($records)) {
                    break;
                }
                
                foreach ($records as $record) {
                    $filePath = $audioDir . $record['file_path'];
                    $fileSize = (int)$record['file_size'];
                    
                    if (file_exists($filePath)) {
                        if (unlink($filePath)) {
                            log_debug("Deleted old audio file: " . $record['file_path'] . " (Size: $fileSize bytes)");
                        } else {
                            log_debug("Failed to delete old audio file: " . $record['file_path']);
                        }
                    } else {
                        log_debug("Old audio file not found on disk, removing from DB: " . $record['file_path']);
                    }
                    
                    $deleteStmt = $pdo->prepare("DELETE FROM audio_cache WHERE id = ?");
                    $deleteStmt->execute([$record['id']]);
                    
                    $deletedBytes += $fileSize;
                    
                    if ($deletedBytes >= $bytesToDelete) {
                        break;
                    }
                }
            }
            log_debug("Audio cleanup finished. Deleted $deletedBytes bytes.");
        }
    } catch (Exception $e) {
        log_debug("Cleanup error: " . $e->getMessage());
    }
}

try {
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

    // Clean and normalize text
    $text = str_replace("\r\n", "\n", $text);
    $text = trim(stripslashes($text));

    // Normalize speed to 2 decimal places to prevent float/string representation issues
    $speed = number_format((float)$speed, 2, '.', '');

    log_debug("Request received. Text length: " . strlen($text) . ", Voice: $voice, Speed: $speed");

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
            log_debug("Cache hit: " . $cached['file_path']);
            echo json_encode(['audio_url' => AUDIO_URL . $cached['file_path'], 'cached' => true]);
            exit;
        }
    } catch (PDOException $e) {
        log_debug("DB Cache check error: " . $e->getMessage());
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
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($httpCode !== 200) {
        log_debug("TTS API Error. Code: $httpCode, Response: $response, CurlError: $curlError");
        http_response_code(500);
        echo json_encode(['error' => 'TTS API Error', 'details' => $response]);
        exit;
    }

    $result = json_decode($response, true);
    if (isset($result['audioContent'])) {
        $audioData = base64_decode($result['audioContent']);
        $fileName = $textHash . '_' . $voice . '_' . str_replace('.', '-', $speed) . '.mp3';
        $filePath = AUDIO_DIR . $fileName;

        // Ensure directory exists
        if (!is_dir(AUDIO_DIR)) {
            log_debug("Audio directory does not exist. Attempting to create: " . AUDIO_DIR);
            if (!mkdir(AUDIO_DIR, 0755, true)) {
                log_debug("Failed to create audio directory.");
                throw new Exception("Failed to create audio directory.");
            }
        }

        // Check writability
        if (!is_writable(AUDIO_DIR)) {
            log_debug("Audio directory is not writable: " . AUDIO_DIR);
            // Attempt to fix permissions (might not work depending on server config)
            chmod(AUDIO_DIR, 0755);
            if (!is_writable(AUDIO_DIR)) {
                throw new Exception("Audio directory is not writable.");
            }
        }

        log_debug("Saving audio to: $filePath");

        if (file_put_contents($filePath, $audioData)) {
            // Save to DB
            try {
                $fileSize = strlen($audioData);
                $stmt = $pdo->prepare("INSERT INTO audio_cache (text_hash, text_content, voice_name, speed, file_path, file_size) VALUES (?, ?, ?, ?, ?, ?)");
                $stmt->execute([$textHash, $text, $voice, $speed, $fileName, $fileSize]);

                // Cleanup if over limit
                cleanup_old_audio_files($pdo);
            } catch (PDOException $e) {
                log_debug("DB Save error: " . $e->getMessage());
            }

            echo json_encode(['audio_url' => AUDIO_URL . $fileName, 'cached' => false]);
        } else {
            $error = error_get_last();
            log_debug("Failed to write file. Error: " . ($error['message'] ?? 'Unknown'));
            http_response_code(500);
            echo json_encode(['error' => 'Failed to save audio file', 'details' => $error['message'] ?? 'Unknown']);
        }
    } else {
        log_debug("Invalid TTS Response: $response");
        http_response_code(500);
        echo json_encode(['error' => 'Invalid TTS Response']);
    }
} catch (Exception $e) {
    log_debug("Fatal Error: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode(['error' => 'Internal Server Error', 'message' => $e->getMessage()]);
}

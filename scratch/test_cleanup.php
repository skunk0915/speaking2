<?php
echo "=== Audio Cleanup SQLite Local Test ===\n";

// 1. Setup SQLite in-memory DB
try {
    $pdo = new PDO("sqlite::memory:");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    
    $pdo->exec("CREATE TABLE IF NOT EXISTS `audio_cache` (
      `id` INTEGER PRIMARY KEY AUTOINCREMENT,
      `text_hash` VARCHAR(64) NOT NULL,
      `text_content` TEXT NOT NULL,
      `voice_name` VARCHAR(50) NOT NULL,
      `speed` DECIMAL(3,2) NOT NULL,
      `file_path` VARCHAR(255) NOT NULL,
      `file_size` INTEGER NOT NULL DEFAULT 0,
      `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )");
    echo "SQLite table created.\n";
} catch (Exception $e) {
    echo "SQLite setup error: " . $e->getMessage() . "\n";
    exit(1);
}

// 2. Define target test directory (scratch/test_audio/)
$testAudioDir = __DIR__ . '/test_audio/';
if (!is_dir($testAudioDir)) {
    mkdir($testAudioDir, 0755, true);
}

// 3. Define cleanup function with a small limit for testing (e.g., 200 bytes limit)
function test_cleanup_old_audio_files($pdo, $audioDir, $maxLimit = 200)
{
    try {
        $stmt = $pdo->query("SELECT SUM(file_size) as total_size FROM audio_cache");
        $row = $stmt->fetch();
        $totalSize = (int)($row['total_size'] ?? 0);
        
        echo "[Test] Current total audio cache size: $totalSize bytes (Limit: $maxLimit bytes)\n";
        
        if ($totalSize > $maxLimit) {
            $bytesToDelete = $totalSize - $maxLimit;
            echo "[Test] Need to delete at least $bytesToDelete bytes\n";
            
            $deletedBytes = 0;
            
            while ($deletedBytes < $bytesToDelete) {
                // In SQLite, MySQL ordering 'ORDER BY created_at ASC, id ASC' is identical
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
                            echo "[Test] Deleted old audio file: " . $record['file_path'] . " (Size: $fileSize bytes)\n";
                        } else {
                            echo "[Test] Failed to delete old audio file: " . $record['file_path'] . "\n";
                        }
                    } else {
                        echo "[Test] Old audio file not found on disk, removing from DB: " . $record['file_path'] . "\n";
                    }
                    
                    $deleteStmt = $pdo->prepare("DELETE FROM audio_cache WHERE id = ?");
                    $deleteStmt->execute([$record['id']]);
                    
                    $deletedBytes += $fileSize;
                    
                    if ($deletedBytes >= $bytesToDelete) {
                        break;
                    }
                }
            }
            echo "[Test] Audio cleanup finished. Deleted $deletedBytes bytes.\n";
        }
    } catch (Exception $e) {
        echo "[Test] Cleanup error: " . $e->getMessage() . "\n";
    }
}

// 4. Create dummy files
$fileName1 = 'test_1.mp3';
$filePath1 = $testAudioDir . $fileName1;
$fileName2 = 'test_2.mp3';
$filePath2 = $testAudioDir . $fileName2;
$fileName3 = 'test_3.mp3';
$filePath3 = $testAudioDir . $fileName3;

file_put_contents($filePath1, str_repeat('A', 100)); // 100 bytes
file_put_contents($filePath2, str_repeat('B', 80));  // 80 bytes
file_put_contents($filePath3, str_repeat('C', 70));  // 70 bytes

echo "Created files: test_1 (100B), test_2 (80B), test_3 (70B). Total = 250B.\n";

// 5. Populate DB
// Simulating older created_at dates using SQLite DateTime functions
$stmt = $pdo->prepare("INSERT INTO audio_cache (text_hash, text_content, voice_name, speed, file_path, file_size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)");

$stmt->execute(['h1', 'content 1', 'voice', 1.0, $fileName1, 100, '2026-06-03 10:00:00']);
$stmt->execute(['h2', 'content 2', 'voice', 1.0, $fileName2, 80, '2026-06-03 11:00:00']);
$stmt->execute(['h3', 'content 3', 'voice', 1.0, $fileName3, 70, '2026-06-03 12:00:00']);

echo "DB populated.\n";

// 6. Execute cleanup (with limit 200 bytes. Since total is 250 bytes, it should delete test_1 which is 100 bytes, leaving 150 bytes)
test_cleanup_old_audio_files($pdo, $testAudioDir, 200);

// 7. Verify result
echo "\n--- Verification Results ---\n";
$remaining = $pdo->query("SELECT * FROM audio_cache ORDER BY created_at ASC")->fetchAll();
echo "Remaining DB records: " . count($remaining) . "\n";
foreach ($remaining as $r) {
    echo "  - File: {$r['file_path']}, Size: {$r['file_size']}, Created: {$r['created_at']}\n";
}

echo "test_1 file exists: " . (file_exists($filePath1) ? "YES" : "NO") . " (Expected: NO)\n";
echo "test_2 file exists: " . (file_exists($filePath2) ? "YES" : "NO") . " (Expected: YES)\n";
echo "test_3 file exists: " . (file_exists($filePath3) ? "YES" : "NO") . " (Expected: YES)\n";

// Clean up test environment
@unlink($filePath1);
@unlink($filePath2);
@unlink($filePath3);
@rmdir($testAudioDir);
echo "Local verification finished.\n";

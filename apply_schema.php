<?php
require_once __DIR__ . '/db/db.php';

$sql = file_get_contents(__DIR__ . '/db/schema.sql');

try {
    // PDO can't execute multiple statements easily in one go with exec if they are separated by ; 
    // unless you use a specific configuration or just split them.
    $statements = array_filter(array_map('trim', explode(';', $sql)));
    foreach ($statements as $stmt) {
        if ($stmt) {
            $pdo->exec($stmt);
            echo "Executed: " . substr($stmt, 0, 50) . "...\n";
        }
    }
    // Check if reviews.memo column exists, if not, add it
    $result = $pdo->query("SHOW COLUMNS FROM `reviews` LIKE 'memo'");
    if ($result->rowCount() === 0) {
        $pdo->exec("ALTER TABLE `reviews` ADD COLUMN `memo` TEXT DEFAULT NULL");
        echo "Added column 'memo' to 'reviews' table.\n";
    }
    // Check if audio_cache.speed is float, if so modify it to decimal(3,2)
    $result = $pdo->query("SHOW COLUMNS FROM `audio_cache` LIKE 'speed'");
    $column = $result->fetch();
    if ($column && strpos(strtolower($column['Type']), 'float') !== false) {
        $pdo->exec("ALTER TABLE `audio_cache` MODIFY COLUMN `speed` DECIMAL(3,2) NOT NULL");
        echo "Modified column 'speed' in 'audio_cache' to DECIMAL(3,2).\n";
    }

    // Check if audio_cache.file_size column exists, if not, add it
    $result = $pdo->query("SHOW COLUMNS FROM `audio_cache` LIKE 'file_size'");
    if ($result->rowCount() === 0) {
        $pdo->exec("ALTER TABLE `audio_cache` ADD COLUMN `file_size` INT(11) NOT NULL DEFAULT 0 AFTER `file_path`");
        echo "Added column 'file_size' to 'audio_cache' table.\n";
    }

    // Populate file_size for existing records
    $stmt = $pdo->query("SELECT id, file_path FROM `audio_cache` WHERE `file_size` = 0");
    $records = $stmt->fetchAll();
    if (count($records) > 0) {
        $updateStmt = $pdo->prepare("UPDATE `audio_cache` SET `file_size` = ? WHERE `id` = ?");
        $updatedCount = 0;
        $audioDir = defined('AUDIO_DIR') ? AUDIO_DIR : __DIR__ . '/audio/';
        foreach ($records as $record) {
            $filePath = $audioDir . $record['file_path'];
            if (file_exists($filePath)) {
                $size = filesize($filePath);
                $updateStmt->execute([$size, $record['id']]);
                $updatedCount++;
            }
        }
        echo "Updated file sizes for $updatedCount existing audio cache records.\n";
    }

    echo "Schema updated successfully.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

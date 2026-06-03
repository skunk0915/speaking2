<?php
require_once __DIR__ . '/../db/db.php';

echo "=== AUDIO CACHE RECORDS ===\n";
$stmt = $pdo->query("SELECT id, text_hash, SUBSTRING(text_content, 1, 50) as text_content, voice_name, speed, file_path, file_size, created_at FROM audio_cache ORDER BY created_at DESC LIMIT 10");
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    print_r($row);
}

echo "=== REVIEW RECORDS ===\n";
$stmt = $pdo->query("SELECT id, user_id, SUBSTRING(japanese, 1, 50) as japanese, content, created_at FROM reviews ORDER BY created_at DESC LIMIT 5");
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    print_r($row);
}

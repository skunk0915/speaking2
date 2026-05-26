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
    echo "Schema updated successfully.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

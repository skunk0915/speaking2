<?php
require_once __DIR__ . '/db/db.php';
echo "Connected to " . DB_HOST . "\n";
$stmt = $pdo->query("SHOW TABLES");
$tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
echo "Tables: " . implode(", ", $tables) . "\n";

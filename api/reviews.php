<?php
session_start();
require_once __DIR__ . '/../db/db.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

$userId = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // List reviews
    try {
        $stmt = $pdo->prepare("SELECT id, content, japanese, created_at FROM reviews WHERE user_id = ? ORDER BY created_at DESC");
        $stmt->execute([$userId]);
        $reviews = $stmt->fetchAll();
        
        $results = [];
        foreach ($reviews as $r) {
            $content = json_decode($r['content'], true);
            // Combine ID and content for the frontend
            $results[] = array_merge(['id' => $r['id']], $content);
        }
        
        echo json_encode(['status' => 'success', 'reviews' => $results]);
    } catch (Exception $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    // Add/Update review
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $japanese = $input['japanese'] ?? '';
        
        if (!$japanese) {
            echo json_encode(['status' => 'error', 'message' => 'Japanese content is required']);
            exit;
        }

        // We store the whole object in content for future flexibility, 
        // but keep 'japanese' as a key for easy searching.
        $content = json_encode($input);

        // Check if exists
        $stmt = $pdo->prepare("SELECT id FROM reviews WHERE user_id = ? AND japanese = ?");
        $stmt->execute([$userId, $japanese]);
        $existing = $stmt->fetch();

        if ($existing) {
            // Update
            $stmt = $pdo->prepare("UPDATE reviews SET content = ? WHERE id = ?");
            $stmt->execute([$content, $existing['id']]);
            echo json_encode(['status' => 'success', 'id' => $existing['id'], 'action' => 'updated']);
        } else {
            // Insert
            $stmt = $pdo->prepare("INSERT INTO reviews (user_id, japanese, content) VALUES (?, ?, ?)");
            $stmt->execute([$userId, $japanese, $content]);
            echo json_encode(['status' => 'success', 'id' => $pdo->lastInsertId(), 'action' => 'inserted']);
        }
    } catch (Exception $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
} elseif ($method === 'DELETE') {
    // Delete review by ID or Japanese content
    try {
        $id = $_GET['id'] ?? null;
        
        if ($id) {
            $stmt = $pdo->prepare("DELETE FROM reviews WHERE user_id = ? AND id = ?");
            $stmt->execute([$userId, $id]);
        } else {
            $input = json_decode(file_get_contents('php://input'), true);
            $japanese = $input['japanese'] ?? $_GET['japanese'] ?? '';
            if ($japanese) {
                $stmt = $pdo->prepare("DELETE FROM reviews WHERE user_id = ? AND japanese = ?");
                $stmt->execute([$userId, $japanese]);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'ID or Japanese content is required']);
                exit;
            }
        }
        echo json_encode(['status' => 'success']);
    } catch (Exception $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}

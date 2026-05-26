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
    try {
        // updated_at の降順（直近に使った順）で最大15件を取得
        $stmt = $pdo->prepare("SELECT url, title FROM user_url_history WHERE user_id = ? ORDER BY updated_at DESC LIMIT 15");
        $stmt->execute([$userId]);
        $history = $stmt->fetchAll();
        
        echo json_encode(['status' => 'success', 'history' => $history]);
    } catch (Exception $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $url = $input['url'] ?? '';
        $title = $input['title'] ?? '';
        
        if (!$url) {
            echo json_encode(['status' => 'error', 'message' => 'URL is required']);
            exit;
        }

        // 既存の同一URLの履歴があるか確認 (テキストの比較なので完全一致)
        $stmt = $pdo->prepare("SELECT id FROM user_url_history WHERE user_id = ? AND url = ?");
        $stmt->execute([$userId, $url]);
        $existing = $stmt->fetch();

        if ($existing) {
            // 既存レコードがあれば updated_at を現在時刻に更新し、タイトルも更新
            $stmt = $pdo->prepare("UPDATE user_url_history SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
            $stmt->execute([$title, $existing['id']]);
            echo json_encode(['status' => 'success', 'action' => 'updated']);
        } else {
            // 新規挿入
            $stmt = $pdo->prepare("INSERT INTO user_url_history (user_id, url, title) VALUES (?, ?, ?)");
            $stmt->execute([$userId, $url, $title]);
            
            // 15件を超える古い履歴があれば、updated_at が古いレコードを自動的に削除してデータをクリーンに保つ
            $stmt = $pdo->prepare("SELECT id FROM user_url_history WHERE user_id = ? ORDER BY updated_at DESC LIMIT 15, 100");
            $stmt->execute([$userId]);
            $toDelete = $stmt->fetchAll();
            if (!empty($toDelete)) {
                $ids = array_column($toDelete, 'id');
                $inClause = implode(',', array_fill(0, count($ids), '?'));
                $delStmt = $pdo->prepare("DELETE FROM user_url_history WHERE id IN ($inClause)");
                $delStmt->execute($ids);
            }
            
            echo json_encode(['status' => 'success', 'action' => 'inserted']);
        }
    } catch (Exception $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
} elseif ($method === 'DELETE') {
    try {
        $url = $_GET['url'] ?? '';
        if (!$url) {
            $input = json_decode(file_get_contents('php://input'), true);
            $url = $input['url'] ?? '';
        }
        
        if (!$url) {
            echo json_encode(['status' => 'error', 'message' => 'URL is required']);
            exit;
        }

        $stmt = $pdo->prepare("DELETE FROM user_url_history WHERE user_id = ? AND url = ?");
        $stmt->execute([$userId, $url]);
        echo json_encode(['status' => 'success']);
    } catch (Exception $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}

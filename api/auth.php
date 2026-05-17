<?php
session_start([
    'cookie_lifetime' => 86400 * 30, // 30 days
    'cookie_httponly' => true,
    'cookie_secure' => isset($_SERVER['HTTPS']),
    'use_strict_mode' => true,
]);

require_once __DIR__ . '/../db/db.php';

header('Content-Type: application/json');

// Ensure user_tokens table exists (self-healing migration)
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `user_tokens` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `user_id` int(11) NOT NULL,
      `token` varchar(64) NOT NULL,
      `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      UNIQUE KEY `token` (`token`),
      KEY `user_id` (`user_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
} catch (PDOException $e) {
    // Ignore database errors here
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $_GET['action'] ?? $input['action'] ?? '';

switch ($action) {
    case 'signup':
        $email = trim($input['email'] ?? '');
        $password = $input['password'] ?? '';

        if (!$email || !$password) {
            echo json_encode(['status' => 'error', 'message' => 'メールアドレスとパスワードを入力してください。']);
            exit;
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['status' => 'error', 'message' => 'メールアドレスの形式が正しくありません。']);
            exit;
        }

        $passwordHash = password_hash($password, PASSWORD_DEFAULT);

        try {
            $stmt = $pdo->prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)");
            $stmt->execute([$email, $passwordHash]);
            $userId = $pdo->lastInsertId();

            $_SESSION['user_id'] = $userId;
            $_SESSION['email'] = $email;

            // Generate remember token
            $token = bin2hex(random_bytes(32));
            $tokenStmt = $pdo->prepare("INSERT INTO user_tokens (user_id, token) VALUES (?, ?)");
            $tokenStmt->execute([$userId, $token]);

            echo json_encode([
                'status' => 'success', 
                'user' => ['id' => $userId, 'email' => $email],
                'remember_token' => $token
            ]);
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) {
                echo json_encode(['status' => 'error', 'message' => 'このメールアドレスは既に登録されています。']);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'サインアップに失敗しました。' . $e->getMessage()]);
            }
        }
        break;

    case 'login':
        $email = trim($input['email'] ?? '');
        $password = $input['password'] ?? '';

        if (!$email || !$password) {
            echo json_encode(['status' => 'error', 'message' => 'メールアドレスとパスワードを入力してください。']);
            exit;
        }

        try {
            $stmt = $pdo->prepare("SELECT id, email, password_hash FROM users WHERE email = ?");
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            if ($user && password_verify($password, $user['password_hash'])) {
                $userId = $user['id'];
                $_SESSION['user_id'] = $userId;
                $_SESSION['email'] = $user['email'];

                // Generate remember token
                $token = bin2hex(random_bytes(32));
                $tokenStmt = $pdo->prepare("INSERT INTO user_tokens (user_id, token) VALUES (?, ?)");
                $tokenStmt->execute([$userId, $token]);

                echo json_encode([
                    'status' => 'success', 
                    'user' => ['id' => $userId, 'email' => $user['email']],
                    'remember_token' => $token
                ]);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'メールアドレスまたはパスワードが正しくありません。']);
            }
        } catch (PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => 'ログイン中にエラーが発生しました。']);
        }
        break;

    case 'login_by_token':
        $token = trim($input['token'] ?? '');
        if (!$token) {
            echo json_encode(['status' => 'error', 'message' => 'トークンがありません。']);
            exit;
        }

        try {
            // Find token
            $stmt = $pdo->prepare("SELECT ut.user_id, u.email FROM user_tokens ut JOIN users u ON ut.user_id = u.id WHERE ut.token = ?");
            $stmt->execute([$token]);
            $user = $stmt->fetch();

            if ($user) {
                $_SESSION['user_id'] = $user['user_id'];
                $_SESSION['email'] = $user['email'];
                echo json_encode([
                    'status' => 'success',
                    'user' => ['id' => $user['user_id'], 'email' => $user['email']]
                ]);
            } else {
                echo json_encode(['status' => 'error', 'message' => '無効または期限切れのトークンです。']);
            }
        } catch (PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => 'トークン認証中にエラーが発生しました。']);
        }
        break;

    case 'logout':
        $token = trim($input['token'] ?? '');
        if ($token) {
            try {
                $stmt = $pdo->prepare("DELETE FROM user_tokens WHERE token = ?");
                $stmt->execute([$token]);
            } catch (PDOException $e) {
                // Ignore DB error on logout
            }
        }

        session_destroy();
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        echo json_encode(['status' => 'success']);
        break;

    case 'check':
        if (isset($_SESSION['user_id'])) {
            echo json_encode(['status' => 'success', 'user' => ['id' => $_SESSION['user_id'], 'email' => $_SESSION['email']]]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'ログインしていません。']);
        }
        break;

    default:
        echo json_encode(['status' => 'error', 'message' => '無効なアクションです。']);
}

<?php
// api/auth/reset-password.php
header('Content-Type: application/json; charset=utf-8');

require_once '../../config/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$token = trim($input['token'] ?? '');
$email = trim($input['email'] ?? '');
$password = trim($input['password'] ?? '');

if (empty($token) || empty($email) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'Datos incompletos']);
    exit;
}

if (strlen($password) < 8) {
    echo json_encode(['success' => false, 'message' => 'La contraseña debe tener al menos 8 caracteres']);
    exit;
}

try {
    $db = Database::getInstance();
    $stmt = $db->prepare("SELECT id FROM usuarios WHERE email = :email AND reset_token = :token AND reset_token_expires > NOW() LIMIT 1");
    $stmt->execute(['email' => $email, 'token' => $token]);
    $user = $stmt->fetch();

    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'Enlace inválido o expirado']);
        exit;
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $update = $db->prepare("UPDATE usuarios SET password_hash = :hash, reset_token = NULL, reset_token_expires = NULL WHERE id = :id");
    $update->execute(['hash' => $hash, 'id' => $user['id']]);

    echo json_encode(['success' => true, 'message' => 'Contraseña restablecida correctamente. Ya puedes iniciar sesión.']);
} catch (Exception $e) {
    error_log('Error reset-password: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error del servidor']);
}
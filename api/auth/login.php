<?php
// api/auth/login.php
header('Content-Type: application/json; charset=utf-8');

require_once '../../config/bootstrap.php';
require_once '../../src/Models/User.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

// ==========================================
// Rate limiting básico (5 intentos / 15 min por sesión)
// ==========================================
$maxAttempts = 5;
$windowSeconds = 900; // 15 min

$now = time();
$attempts = $_SESSION['login_attempts'] ?? [];
// Limpiar intentos antiguos
$attempts = array_values(array_filter($attempts, fn($t) => ($now - $t) < $windowSeconds));

if (count($attempts) >= $maxAttempts) {
    $retryAfter = $windowSeconds - ($now - $attempts[0]);
    http_response_code(429);
    header('Retry-After: ' . $retryAfter);
    echo json_encode([
        'success' => false,
        'message' => 'Demasiados intentos. Espera ' . ceil($retryAfter / 60) . ' minutos.'
    ]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

$email = trim($input['email'] ?? '');
$password = (string)($input['password'] ?? '');

if ($email === '' || $password === '') {
    echo json_encode(['success' => false, 'message' => 'Datos incompletos']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Credenciales incorrectas']);
    exit;
}

try {
    $userModel = new User();
    $user = $userModel->findByEmail($email);

    // Registrar intento SIEMPRE (exista o no el usuario)
    $attempts[] = $now;
    $_SESSION['login_attempts'] = $attempts;

    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'Credenciales incorrectas']);
        exit;
    }

    if ((int)$user['activo'] === 0) {
        echo json_encode(['success' => false, 'message' => 'Cuenta desactivada. Contacta al administrador.']);
        exit;
    }

    if (empty($user['password_hash']) || !password_verify($password, $user['password_hash'])) {
        echo json_encode(['success' => false, 'message' => 'Credenciales incorrectas']);
        exit;
    }

    // Login exitoso → limpiar intentos + regenerar sesión
    unset($_SESSION['login_attempts']);
    session_regenerate_id(true);

    $_SESSION['user_id']    = $user['id'];
    $_SESSION['user_name']  = $user['nombre'];
    $_SESSION['user_role']  = $user['rol'];
    $_SESSION['user_email'] = $user['email'];

    echo json_encode([
        'success' => true,
        'message' => 'Bienvenido ' . $user['nombre'],
        'user' => [
            'name'  => $user['nombre'],
            'email' => $user['email'],
            'role'  => $user['rol']
        ]
    ]);

} catch (Exception $e) {
    error_log('Error en login.php: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error del servidor']);
}
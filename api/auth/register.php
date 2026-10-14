<?php
// api/auth/register.php
header('Content-Type: application/json; charset=utf-8');

require_once '../../config/bootstrap.php';
require_once '../../src/Models/User.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    echo json_encode(['success' => false, 'message' => 'Datos inválidos']);
    exit;
}

$nombre = trim($input['nombre'] ?? '');
$email  = trim($input['email'] ?? '');
$password = (string)($input['password'] ?? '');

// ==========================================
// Validaciones estrictas
// ==========================================

// Nombre: 2-60 caracteres, sin etiquetas HTML
if (mb_strlen($nombre) < 2 || mb_strlen($nombre) > 60) {
    echo json_encode(['success' => false, 'message' => 'El nombre debe tener entre 2 y 60 caracteres']);
    exit;
}

if (preg_match('/[<>]/', $nombre)) {
    echo json_encode(['success' => false, 'message' => 'El nombre contiene caracteres no permitidos']);
    exit;
}

// Email válido y longitud razonable
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150) {
    echo json_encode(['success' => false, 'message' => 'Correo electrónico inválido']);
    exit;
}

// Password: 8-72 caracteres (72 = límite de bcrypt)
if (strlen($password) < 8) {
    echo json_encode(['success' => false, 'message' => 'La contraseña debe tener al menos 8 caracteres']);
    exit;
}

if (strlen($password) > 72) {
    echo json_encode(['success' => false, 'message' => 'La contraseña no puede superar los 72 caracteres']);
    exit;
}

if (!preg_match('/[A-Z]/', $password)) {
    echo json_encode(['success' => false, 'message' => 'La contraseña debe incluir al menos una mayúscula']);
    exit;
}

if (!preg_match('/[a-z]/', $password)) {
    echo json_encode(['success' => false, 'message' => 'La contraseña debe incluir al menos una minúscula']);
    exit;
}

if (!preg_match('/[0-9]/', $password)) {
    echo json_encode(['success' => false, 'message' => 'La contraseña debe incluir al menos un número']);
    exit;
}

// ==========================================
// Crear usuario
// ==========================================
try {
    $userModel = new User();

    $existingUser = $userModel->findByEmail($email);
    if ($existingUser) {
        // Mensaje genérico (evita enumeración de usuarios)
        echo json_encode(['success' => false, 'message' => 'No se pudo crear la cuenta con esos datos.']);
        exit;
    }

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    $success = $userModel->create($nombre, $email, $passwordHash);

    if ($success) {
        echo json_encode(['success' => true, 'message' => 'Cuenta creada exitosamente. Ya puedes iniciar sesión.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'No se pudo crear la cuenta.']);
    }

} catch (Exception $e) {
    error_log('Error en register.php: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error del servidor']);
}
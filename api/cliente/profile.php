<?php
// api/cliente/profile.php
header('Content-Type: application/json; charset=utf-8');

require_once '../../config/bootstrap.php';
requireAuth();

$userId = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

try {
    $db = Database::getInstance();

    // GET: Obtener perfil
    if ($method === 'GET') {
        $stmt = $db->prepare("SELECT id, nombre, email, created_at FROM usuarios WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $userId]);
        $user = $stmt->fetch();

        if (!$user) {
            echo json_encode(['success' => false, 'message' => 'Usuario no encontrado']);
            exit;
        }

        echo json_encode([
            'success' => true,
            'data' => $user
        ]);
        exit;
    }

    // PUT: Actualizar perfil
    if ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        $nombre = trim($input['nombre'] ?? '');
        $email = trim($input['email'] ?? '');

        if (empty($nombre) || empty($email)) {
            echo json_encode(['success' => false, 'message' => 'Nombre y email son obligatorios']);
            exit;
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['success' => false, 'message' => 'Email inválido']);
            exit;
        }

        $stmt = $db->prepare("SELECT id FROM usuarios WHERE email = :email AND id != :id LIMIT 1");
        $stmt->execute(['email' => $email, 'id' => $userId]);
        if ($stmt->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Este email ya está en uso']);
            exit;
        }

        $stmt = $db->prepare("UPDATE usuarios SET nombre = :nombre, email = :email WHERE id = :id");
        $stmt->execute([
            'nombre' => $nombre,
            'email' => $email,
            'id' => $userId
        ]);

        $_SESSION['user_name'] = $nombre;
        $_SESSION['user_email'] = $email;

        echo json_encode([
            'success' => true,
            'message' => 'Perfil actualizado correctamente'
        ]);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);

} catch (Exception $e) {
    error_log("Error en profile.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error del servidor']);
}
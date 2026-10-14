<?php
// api/admin/users.php
header('Content-Type: application/json; charset=utf-8');

require_once '../../config/bootstrap.php';
requireAdmin();

$method = $_SERVER['REQUEST_METHOD'];

try {
    $db = Database::getInstance();

    // GET: Listar usuarios
    if ($method === 'GET') {
        $stmt = $db->query("SELECT id, nombre, email, rol, activo, created_at FROM usuarios ORDER BY created_at DESC");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        exit;
    }

    // PUT: Cambiar rol / estado
    if ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        $id = intval($input['id'] ?? 0);
        $rol = strtolower(trim($input['rol'] ?? ''));
        $activo = intval($input['activo'] ?? 1);

        if ($id <= 0 || !in_array($rol, ['admin', 'cliente'])) {
            echo json_encode(['success' => false, 'message' => 'Datos inválidos']);
            exit;
        }

        if ($id === intval($_SESSION['user_id']) && ($rol !== 'admin' || $activo !== 1)) {
            echo json_encode(['success' => false, 'message' => 'No puedes modificar tu propia cuenta de admin']);
            exit;
        }

        $stmt = $db->prepare("UPDATE usuarios SET rol = :rol, activo = :activo WHERE id = :id");
        $stmt->execute(['rol' => $rol, 'activo' => $activo, 'id' => $id]);
        echo json_encode(['success' => true, 'message' => 'Usuario actualizado correctamente']);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);

} catch (Exception $e) {
    error_log('Error en api/admin/users.php: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error del servidor']);
}
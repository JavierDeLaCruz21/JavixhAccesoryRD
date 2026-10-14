<?php
// api/admin/bancos.php
header('Content-Type: application/json; charset=utf-8');

require_once '../../config/bootstrap.php';
requireAdmin();

$method = $_SERVER['REQUEST_METHOD'];

try {
    $db = Database::getInstance();

    // GET: Listar todos los bancos
    if ($method === 'GET') {
        $stmt = $db->query("SELECT * FROM bancos ORDER BY orden ASC");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        exit;
    }

    // POST: Crear o actualizar banco
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $id = intval($input['id'] ?? 0);
        $nombre = trim($input['nombre'] ?? '');
        $tipo_cuenta = trim($input['tipo_cuenta'] ?? 'Ahorro');
        $numero_cuenta = trim($input['numero_cuenta'] ?? '');
        $titular = trim($input['titular'] ?? '');
        $logo = trim($input['logo'] ?? '');
        $activo = intval($input['activo'] ?? 1);
        $orden = intval($input['orden'] ?? 0);

        if ($nombre === '' || $numero_cuenta === '' || $titular === '') {
            echo json_encode(['success' => false, 'message' => 'Nombre, número de cuenta y titular son obligatorios']);
            exit;
        }

        if ($id > 0) {
            $stmt = $db->prepare("
                UPDATE bancos
                SET nombre = :nombre, tipo_cuenta = :tipo, numero_cuenta = :numero,
                    titular = :titular, logo = :logo, activo = :activo, orden = :orden
                WHERE id = :id
            ");
            $stmt->execute([
                'nombre' => $nombre, 'tipo' => $tipo_cuenta, 'numero' => $numero_cuenta,
                'titular' => $titular, 'logo' => $logo, 'activo' => $activo,
                'orden' => $orden, 'id' => $id
            ]);
            echo json_encode(['success' => true, 'message' => 'Banco actualizado correctamente']);
        } else {
            $stmt = $db->prepare("
                INSERT INTO bancos (nombre, tipo_cuenta, numero_cuenta, titular, logo, activo, orden)
                VALUES (:nombre, :tipo, :numero, :titular, :logo, :activo, :orden)
            ");
            $stmt->execute([
                'nombre' => $nombre, 'tipo' => $tipo_cuenta, 'numero' => $numero_cuenta,
                'titular' => $titular, 'logo' => $logo, 'activo' => $activo, 'orden' => $orden
            ]);
            echo json_encode(['success' => true, 'message' => 'Banco creado correctamente', 'id' => $db->lastInsertId()]);
        }
        exit;
    }

    // DELETE: Eliminar banco
    if ($method === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);
        $id = intval($input['id'] ?? 0);

        if ($id <= 0) {
            echo json_encode(['success' => false, 'message' => 'ID inválido']);
            exit;
        }

        $stmt = $db->prepare("DELETE FROM bancos WHERE id = :id");
        $stmt->execute(['id' => $id]);
        echo json_encode(['success' => true, 'message' => 'Banco eliminado correctamente']);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);

} catch (Exception $e) {
    error_log('Error en admin/bancos.php: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error del servidor']);
}
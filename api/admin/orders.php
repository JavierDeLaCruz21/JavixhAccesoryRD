<?php
// api/admin/orders.php
header('Content-Type: application/json; charset=utf-8');

require_once '../../config/bootstrap.php';
requireAdmin();

$method = $_SERVER['REQUEST_METHOD'];

try {
    $db = Database::getInstance();

    // GET: Listar pedidos con cliente y detalles
    if ($method === 'GET') {
        $stmt = $db->query("
            SELECT p.*, u.nombre AS cliente_nombre, u.email AS cliente_email
            FROM pedidos p
            LEFT JOIN usuarios u ON p.usuario_id = u.id
            ORDER BY p.fecha_pedido DESC
        ");
        $orders = $stmt->fetchAll();

        foreach ($orders as &$order) {
            $d = $db->prepare("
                SELECT pd.cantidad, pd.precio_unitario,
                       COALESCE(pr.nombre, 'Producto eliminado') AS producto_nombre
                FROM pedido_detalle pd
                LEFT JOIN productos pr ON pr.id = pd.producto_id
                WHERE pd.pedido_id = :pid
            ");
            $d->execute(['pid' => $order['id']]);
            $order['detalles'] = $d->fetchAll();
        }

        echo json_encode(['success' => true, 'data' => $orders]);
        exit;
    }

    // PUT: Cambiar estado
    if ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        $id = intval($input['id'] ?? 0);
        $estado = trim($input['estado'] ?? '');
        $validos = ['pendiente', 'verificando_pago', 'preparando', 'listo_entrega', 'entregado', 'cancelado'];

        if ($id <= 0 || !in_array($estado, $validos)) {
            echo json_encode(['success' => false, 'message' => 'Datos inválidos']);
            exit;
        }

        $stmt = $db->prepare("UPDATE pedidos SET estado = :estado WHERE id = :id");
        $stmt->execute(['estado' => $estado, 'id' => $id]);
        echo json_encode(['success' => true, 'message' => 'Estado actualizado']);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);

} catch (Exception $e) {
    error_log('Error en api/admin/orders.php: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error del servidor']);
}
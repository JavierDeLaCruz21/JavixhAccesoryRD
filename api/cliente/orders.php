<?php
// api/cliente/orders.php
header('Content-Type: application/json; charset=utf-8');

require_once '../../config/bootstrap.php';
requireAuth();

$userId = $_SESSION['user_id'];

try {
    $db = Database::getInstance();

    $stmt = $db->prepare("
        SELECT id, total, estado, fecha_pedido, fecha_expiracion, estado_pago
        FROM pedidos 
        WHERE usuario_id = :user_id 
        ORDER BY fecha_pedido DESC
    ");
    $stmt->execute(['user_id' => $userId]);
    $orders = $stmt->fetchAll();

    foreach ($orders as &$order) {
        $stmtDetalle = $db->prepare("
            SELECT pd.producto_id, pd.cantidad, pd.precio_unitario, p.nombre as producto_nombre
            FROM pedido_detalle pd
            LEFT JOIN productos p ON pd.producto_id = p.id
            WHERE pd.pedido_id = :pedido_id
        ");
        $stmtDetalle->execute(['pedido_id' => $order['id']]);
        $order['detalles'] = $stmtDetalle->fetchAll();
    }

    echo json_encode([
        'success' => true,
        'data' => $orders,
        'count' => count($orders)
    ]);

} catch (Exception $e) {
    error_log("Error en orders.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error del servidor']);
}
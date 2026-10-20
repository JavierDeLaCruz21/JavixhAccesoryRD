<?php
// api/cron/expirar.php
// Tarea programada para expirar pedidos impagos y restaurar el inventario

require_once '../../config/bootstrap.php';

try {
    $db = Database::getInstance();
    $db->beginTransaction();

    // 1. Buscar pedidos pendientes que ya expiraron
    $stmt = $db->query("
        SELECT id
        FROM pedidos
        WHERE estado_pago = 'pendiente_pago'
        AND fecha_expiracion < NOW()
        FOR UPDATE
    ");
    $pedidosExpirados = $stmt->fetchAll(PDO::FETCH_COLUMN);

    $totalRestaurados = 0;

    if (!empty($pedidosExpirados)) {
        $stmtItems = $db->prepare("
            SELECT producto_id, cantidad
            FROM pedido_detalle
            WHERE pedido_id = :pedido_id
        ");

        $stmtRestaurarStock = $db->prepare("
            UPDATE productos
            SET stock = stock + :cantidad
            WHERE id = :producto_id
        ");

        $stmtActualizarPedido = $db->prepare("
            UPDATE pedidos
            SET estado_pago = 'expirado', estado = 'cancelado'
            WHERE id = :pedido_id
        ");

        foreach ($pedidosExpirados as $pedidoId) {
            $stmtItems->execute(['pedido_id' => $pedidoId]);
            $items = $stmtItems->fetchAll();

            foreach ($items as $item) {
                if (!empty($item['producto_id']) && (int)$item['cantidad'] > 0) {
                    $stmtRestaurarStock->execute([
                        'cantidad'    => (int)$item['cantidad'],
                        'producto_id' => (int)$item['producto_id']
                    ]);
                    $totalRestaurados += (int)$item['cantidad'];
                }
            }

            $stmtActualizarPedido->execute(['pedido_id' => $pedidoId]);
        }
    }

    $db->commit();

    $count = count($pedidosExpirados);
    if ($count > 0) {
        error_log("Cron: {$count} pedidos expirados automáticamente. {$totalRestaurados} unidades de stock restauradas.");
    }

    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => true,
        'pedidos_expirados' => $count,
        'unidades_restauradas' => $totalRestaurados
    ]);

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    error_log('Error en cron/expirar.php: ' . $e->getMessage());
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'Error al procesar expiraciones']);
}

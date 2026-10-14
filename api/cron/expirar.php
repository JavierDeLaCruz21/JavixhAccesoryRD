<?php
// api/cron/expirar.php
require_once '../../config/bootstrap.php';

try {
    $db = Database::getInstance();

    $stmt = $db->query("
        UPDATE pedidos
        SET estado_pago = 'expirado', estado = 'cancelado'
        WHERE estado_pago = 'pendiente_pago'
        AND fecha_expiracion < NOW()
    ");

    $expirados = $stmt->rowCount();

    if ($expirados > 0) {
        error_log("Cron: {$expirados} pedidos expirados automáticamente");
    }

} catch (Exception $e) {
    error_log('Error en cron/expirar.php: ' . $e->getMessage());
}
<?php
// api/public/bancos.php
header('Content-Type: application/json; charset=utf-8');

require_once '../../config/bootstrap.php';

try {
    $db = Database::getInstance();
    $stmt = $db->query("
        SELECT id, nombre, tipo_cuenta, numero_cuenta, titular, logo, orden
        FROM bancos
        WHERE activo = 1
        ORDER BY orden ASC
    ");
    $bancos = $stmt->fetchAll();

    echo json_encode(['success' => true, 'data' => $bancos]);

} catch (Exception $e) {
    error_log('Error en bancos.php: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error del servidor']);
}
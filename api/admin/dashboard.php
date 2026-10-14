<?php
// api/admin/dashboard.php
header('Content-Type: application/json; charset=utf-8');

require_once '../../config/bootstrap.php';
requireAdmin();

$settingsFile = __DIR__ . '/../../data/settings.json';
$umbral = 5;
if (is_file($settingsFile)) {
    $s = json_decode(file_get_contents($settingsFile), true);
    if (is_array($s) && isset($s['umbral_stock'])) {
        $umbral = max(1, intval($s['umbral_stock']));
    }
}

try {
    $db = Database::getInstance();

    $stmt = $db->query("SELECT COUNT(*) as total FROM productos WHERE activo = 1");
    $totalProductos = $stmt->fetch()['total'];

    $stmt = $db->prepare("SELECT COUNT(*) as total FROM productos WHERE stock < :u AND activo = 1");
    $stmt->execute(['u' => $umbral]);
    $stockBajo = $stmt->fetch()['total'];

    $stmt = $db->query("SELECT COUNT(*) as total FROM pedidos");
    $totalPedidos = $stmt->fetch()['total'];

    $stmt = $db->query("SELECT COUNT(*) as total FROM usuarios WHERE activo = 1");
    $totalUsuarios = $stmt->fetch()['total'];

    $stmt = $db->query("
        SELECT p.id, p.fecha_pedido, p.total, p.estado, u.nombre as cliente
        FROM pedidos p
        LEFT JOIN usuarios u ON p.usuario_id = u.id
        ORDER BY p.fecha_pedido DESC
        LIMIT 5
    ");
    $pedidosRecientes = $stmt->fetchAll();

    $stmt = $db->prepare("
        SELECT id, nombre, stock, precio
        FROM productos
        WHERE stock < :u AND activo = 1
        ORDER BY stock ASC
        LIMIT 5
    ");
    $stmt->execute(['u' => $umbral]);
    $productosStockBajo = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'data' => [
            'total_productos' => (int)$totalProductos,
            'stock_bajo' => (int)$stockBajo,
            'total_pedidos' => (int)$totalPedidos,
            'total_usuarios' => (int)$totalUsuarios,
            'pedidos_recientes' => $pedidosRecientes,
            'productos_stock_bajo' => $productosStockBajo
        ]
    ]);

} catch (Exception $e) {
    error_log('Error en dashboard.php: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error del servidor']);
}
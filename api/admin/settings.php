<?php
// api/admin/settings.php
header('Content-Type: application/json; charset=utf-8');

require_once '../../config/config.php';

$settingsFile = __DIR__ . '/../../data/settings.json';

$defaults = [
    'nombre_tienda' => 'Javich AccesoryShop',
    'whatsapp' => '18295592331',
    'umbral_stock' => 5,
    'notif_pedidos' => true,
    'notif_stock' => true,
    'resumen_diario' => false
];

function leerSettings($file, $defaults) {
    if (is_file($file)) {
        $data = json_decode(file_get_contents($file), true);
        if (is_array($data)) return array_merge($defaults, $data);
    }
    return $defaults;
}

$method = $_SERVER['REQUEST_METHOD'];

// GET: leer configuración (no requiere auth para uso interno del panel)
if ($method === 'GET') {
    echo json_encode(['success' => true, 'data' => leerSettings($settingsFile, $defaults)]);
    exit;
}

// POST: guardar (solo admin)
if ($method === 'POST') {
    // Carga diferida de sesión solo si es POST
    if (session_status() === PHP_SESSION_NONE) {
        ini_set('session.cookie_httponly', '1');
        ini_set('session.cookie_samesite', 'Lax');
        ini_set('session.use_strict_mode', '1');
        session_start();
    }

    if (!isset($_SESSION['user_id']) || strtolower(trim($_SESSION['user_role'] ?? '')) !== 'admin') {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'No autorizado']);
        exit;
    }

    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $merged = array_merge(leerSettings($settingsFile, $defaults), $input);

    $merged['umbral_stock'] = max(1, intval($merged['umbral_stock']));
    $merged['whatsapp'] = preg_replace('/[^0-9]/', '', (string)$merged['whatsapp']);
    $merged['notif_pedidos'] = !empty($merged['notif_pedidos']);
    $merged['notif_stock'] = !empty($merged['notif_stock']);
    $merged['resumen_diario'] = !empty($merged['resumen_diario']);

    $dir = dirname($settingsFile);
    if (!is_dir($dir)) mkdir($dir, 0777, true);
    file_put_contents($settingsFile, json_encode($merged, JSON_PRETTY_PRINT));

    echo json_encode(['success' => true, 'message' => 'Configuración guardada', 'data' => $merged]);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Método no permitido']);
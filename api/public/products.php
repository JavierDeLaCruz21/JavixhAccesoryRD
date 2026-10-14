<?php
// api/public/products.php
header('Content-Type: application/json; charset=utf-8');

require_once '../../config/bootstrap.php';

try {
    $db = Database::getInstance();

    // Detectar columnas opcionales (cacheado en el request)
    $hasIsNew   = tableHasColumn($db, 'productos', 'is_new');
    $hasIsOffer = tableHasColumn($db, 'productos', 'is_offer');
    $hasImg     = tableHasColumn($db, 'productos', 'imagen_principal');

    $selectExtra = '';
    if ($hasIsNew)   $selectExtra .= ', p.is_new';
    if ($hasIsOffer) $selectExtra .= ', p.is_offer';
    if ($hasImg)     $selectExtra .= ', p.imagen_principal';

    $stmt = $db->query("
        SELECT p.id, p.nombre, p.descripcion, p.precio, p.stock,
               c.nombre AS categoria_nombre
               $selectExtra
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        WHERE p.stock > 0 AND p.activo = 1
        ORDER BY p.id DESC
    ");
    $productos = $stmt->fetchAll();

    $defaultImage = './img/android-chrome-192x192.png';

    $formateados = array_map(function($p) use ($defaultImage, $hasImg, $hasIsNew, $hasIsOffer) {
        $imagePath = ($hasImg && !empty($p['imagen_principal']))
            ? $p['imagen_principal']
            : $defaultImage;

        if ($imagePath !== $defaultImage) {
            $checkPath = ltrim($imagePath, './');
            $fullPath = __DIR__ . '/../../' . $checkPath;
            if (!file_exists($fullPath)) {
                $imagePath = $defaultImage;
            }
        }

        return [
            'id'          => (int)$p['id'],
            'name'        => $p['nombre'],
            'description' => $p['descripcion'] ?? '',
            'price'       => (float)$p['precio'],
            'stock'       => (int)$p['stock'],
            'category'    => strtoupper($p['categoria_nombre'] ?? 'ACCESORIOS'),
            'image'       => $imagePath,
            'isNew'       => $hasIsNew   ? !empty($p['is_new'])   : false,
            'isOffer'     => $hasIsOffer ? !empty($p['is_offer']) : false,
            'badge'       => null
        ];
    }, $productos);

    echo json_encode($formateados);

} catch (Exception $e) {
    error_log("Error public products: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Error del servidor']);
}
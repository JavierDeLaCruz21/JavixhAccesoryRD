<?php
// api/public/checkout.php
header('Content-Type: application/json; charset=utf-8');

require_once '../../config/bootstrap.php';
requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$cart = $input['cart'] ?? [];

if (!is_array($cart) || empty($cart)) {
    echo json_encode(['success' => false, 'message' => 'Carrito vacío']);
    exit;
}

// Máximo razonable de items para evitar abuso
if (count($cart) > 50) {
    echo json_encode(['success' => false, 'message' => 'Demasiados productos en el carrito']);
    exit;
}

$db = Database::getInstance();

try {
    $db->beginTransaction();

    // ==========================================
    // 1. Normalizar carrito: agrupar por product_id
    // ==========================================
    $normalized = [];
    foreach ($cart as $item) {
        $pid = intval($item['id'] ?? 0);
        $qty = intval($item['quantity'] ?? 0);
        if ($pid <= 0 || $qty <= 0 || $qty > 999) continue;
        if (!isset($normalized[$pid])) $normalized[$pid] = 0;
        $normalized[$pid] += $qty;
    }

    if (empty($normalized)) {
        $db->rollBack();
        echo json_encode(['success' => false, 'message' => 'Carrito inválido']);
        exit;
    }

    // ==========================================
    // 2. Leer productos reales de la BD con LOCK
    // ==========================================
    $ids = array_keys($normalized);
    $placeholders = implode(',', array_fill(0, count($ids), '?'));

    $stmt = $db->prepare("
        SELECT id, nombre, precio, stock, activo
        FROM productos
        WHERE id IN ($placeholders)
        FOR UPDATE
    ");
    $stmt->execute($ids);
    $productosDb = $stmt->fetchAll();

    // Indexar por id
    $productosIndex = [];
    foreach ($productosDb as $p) {
        $productosIndex[(int)$p['id']] = $p;
    }

    // ==========================================
    // 3. Validar cada item contra la BD (precio y stock REALES)
    // ==========================================
    $total = 0;
    $itemsValidados = [];

    foreach ($normalized as $pid => $qty) {
        if (!isset($productosIndex[$pid])) {
            $db->rollBack();
            echo json_encode(['success' => false, 'message' => "Producto #$pid no existe"]);
            exit;
        }

        $p = $productosIndex[$pid];

        if ((int)$p['activo'] !== 1) {
            $db->rollBack();
            echo json_encode(['success' => false, 'message' => "El producto '{$p['nombre']}' no está disponible"]);
            exit;
        }

        if ((int)$p['stock'] < $qty) {
            $db->rollBack();
            echo json_encode([
                'success' => false,
                'message' => "Stock insuficiente para '{$p['nombre']}'. Disponible: {$p['stock']}"
            ]);
            exit;
        }

        // ⚠️ CLAVE: precio del SERVIDOR, no del cliente
        $precioReal = (float)$p['precio'];
        $subtotal = $precioReal * $qty;
        $total += $subtotal;

        $itemsValidados[] = [
            'id' => $pid,
            'cantidad' => $qty,
            'precio' => $precioReal
        ];
    }

    // ==========================================
    // 4. Crear pedido
    // ==========================================
    $fechaExpiracion = date('Y-m-d H:i:s', time() + (72 * 3600));

    $stmt = $db->prepare("
        INSERT INTO pedidos (usuario_id, total, fecha_expiracion, estado_pago)
        VALUES (:uid, :total, :exp, 'pendiente_pago')
    ");
    $stmt->execute([
        'uid' => $_SESSION['user_id'],
        'total' => $total,
        'exp' => $fechaExpiracion
    ]);
    $pedidoId = (int)$db->lastInsertId();

    // ==========================================
    // 5. Insertar detalles + descontar stock
    // ==========================================
    $stmtDetalle = $db->prepare("
        INSERT INTO pedido_detalle (pedido_id, producto_id, cantidad, precio_unitario)
        VALUES (:pid, :prod, :cant, :precio)
    ");

    // ⚠️ IMPORTANTE: NO reutilizar el mismo placeholder dos veces
    // (:cant1 y :cant2 son distintos aunque tengan el mismo valor)
    $stmtStock = $db->prepare("
        UPDATE productos
        SET stock = stock - :cant1
        WHERE id = :id AND stock >= :cant2
    ");

    foreach ($itemsValidados as $item) {
        // Detalle del pedido
        $stmtDetalle->execute([
            'pid' => $pedidoId,
            'prod' => $item['id'],
            'cant' => $item['cantidad'],
            'precio' => $item['precio']
        ]);

        // Descontar stock (la condición stock >= :cant2 evita sobregiros por concurrencia)
        $stmtStock->execute([
            'cant1' => $item['cantidad'],
            'cant2' => $item['cantidad'],
            'id' => $item['id']
        ]);

        if ($stmtStock->rowCount() === 0) {
            // Alguien más compró en paralelo y agotó el stock
            $db->rollBack();
            echo json_encode([
                'success' => false,
                'message' => 'Stock agotado mientras completabas la compra. Intenta de nuevo.'
            ]);
            exit;
        }
    }

    $db->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Pedido creado correctamente',
        'pedido_id' => $pedidoId,
        'total' => number_format($total, 2, '.', '')
    ]);

} catch (Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    error_log('Error en checkout.php: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error del servidor']);
}
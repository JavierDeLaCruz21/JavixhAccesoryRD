<?php
// api/public/pago.php
header('Content-Type: application/json; charset=utf-8');

require_once '../../config/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    $db = Database::getInstance();

    // GET: Obtener detalles del pedido
    if ($method === 'GET') {
        requireAuth();

        $pedido_id = intval($_GET['pedido'] ?? 0);
        if ($pedido_id <= 0) {
            echo json_encode(['success' => false, 'message' => 'Pedido inválido']);
            exit;
        }

        $stmt = $db->prepare("
            SELECT p.*, u.nombre as cliente_nombre, u.email as cliente_email
            FROM pedidos p
            LEFT JOIN usuarios u ON p.usuario_id = u.id
            WHERE p.id = :id AND p.usuario_id = :uid
        ");
        $stmt->execute(['id' => $pedido_id, 'uid' => $_SESSION['user_id']]);
        $pedido = $stmt->fetch();

        if (!$pedido) {
            echo json_encode(['success' => false, 'message' => 'Pedido no encontrado']);
            exit;
        }

        $stmt = $db->prepare("
            SELECT pd.*, pr.nombre as producto_nombre
            FROM pedido_detalle pd
            LEFT JOIN productos pr ON pd.producto_id = pr.id
            WHERE pd.pedido_id = :pid
        ");
        $stmt->execute(['pid' => $pedido_id]);
        $detalles = $stmt->fetchAll();

        $pedido['detalles'] = $detalles;

        echo json_encode(['success' => true, 'data' => $pedido]);
        exit;
    }

    // POST: Confirmar pago
    if ($method === 'POST') {
        requireAuth();

        $input = json_decode(file_get_contents('php://input'), true);
        $pedido_id = intval($input['pedido_id'] ?? 0);
        $banco_id = intval($input['banco_id'] ?? 0);

        if ($pedido_id <= 0 || $banco_id <= 0) {
            echo json_encode(['success' => false, 'message' => 'Datos inválidos']);
            exit;
        }

        $stmt = $db->prepare("
            SELECT id, estado_pago, fecha_expiracion
            FROM pedidos
            WHERE id = :id AND usuario_id = :uid
        ");
        $stmt->execute(['id' => $pedido_id, 'uid' => $_SESSION['user_id']]);
        $pedido = $stmt->fetch();

        if (!$pedido) {
            echo json_encode(['success' => false, 'message' => 'Pedido no encontrado']);
            exit;
        }

        if ($pedido['estado_pago'] !== 'pendiente_pago') {
            echo json_encode(['success' => false, 'message' => 'Este pedido ya fue procesado']);
            exit;
        }

        if (strtotime($pedido['fecha_expiracion']) < time()) {
            $db->beginTransaction();
            $stmtItems = $db->prepare("SELECT producto_id, cantidad FROM pedido_detalle WHERE pedido_id = :id");
            $stmtItems->execute(['id' => $pedido_id]);
            $items = $stmtItems->fetchAll();

            $stmtRestock = $db->prepare("UPDATE productos SET stock = stock + :cant WHERE id = :pid");
            foreach ($items as $item) {
                if (!empty($item['producto_id']) && (int)$item['cantidad'] > 0) {
                    $stmtRestock->execute(['cant' => (int)$item['cantidad'], 'pid' => (int)$item['producto_id']]);
                }
            }

            $stmt = $db->prepare("UPDATE pedidos SET estado_pago = 'expirado', estado = 'cancelado' WHERE id = :id");
            $stmt->execute(['id' => $pedido_id]);
            $db->commit();

            echo json_encode(['success' => false, 'message' => 'El pedido ha expirado y fue cancelado. Por favor realiza una nueva compra.']);
            exit;
        }

        $stmt = $db->prepare("
            UPDATE pedidos 
            SET estado_pago = 'pagado', estado = 'verificando_pago'
            WHERE id = :id
        ");
        $stmt->execute(['id' => $pedido_id]);

        echo json_encode(['success' => true, 'message' => 'Pago registrado correctamente']);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);

} catch (Exception $e) {
    error_log('Error en pago.php: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error del servidor']);
}
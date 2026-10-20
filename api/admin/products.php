<?php
// api/admin/products.php
header('Content-Type: application/json; charset=utf-8');

require_once '../../config/bootstrap.php';
requireAdmin();

$method = $_SERVER['REQUEST_METHOD'];

try {
    $db = Database::getInstance();

    // ==========================================
    // GET: Listar todos o buscar uno por ID
    // ==========================================
    if ($method === 'GET') {
        if (isset($_GET['id'])) {
            $stmt = $db->prepare("
                SELECT p.*, c.nombre AS categoria_nombre
                FROM productos p
                LEFT JOIN categorias c ON p.categoria_id = c.id
                WHERE p.id = :id
            ");
            $stmt->execute(['id' => intval($_GET['id'])]);
            $product = $stmt->fetch();
            if (!$product) {
                echo json_encode(['success' => false, 'message' => 'Producto no encontrado']);
                exit;
            }
            echo json_encode(['success' => true, 'data' => $product]);
            exit;
        }

        $stmt = $db->query("
            SELECT p.*, c.nombre AS categoria_nombre
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            ORDER BY p.id DESC
        ");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        exit;
    }

    // ==========================================
    // POST: Crear o Actualizar (si viene 'id')
    // ==========================================
    if ($method === 'POST') {
        $id           = intval($_POST['id'] ?? 0);
        $nombre       = trim($_POST['nombre'] ?? '');
        $descripcion  = trim($_POST['descripcion'] ?? '');
        $precio       = floatval($_POST['precio'] ?? 0);
        $stock        = intval($_POST['stock'] ?? 0);
        $categoria    = trim($_POST['categoria'] ?? '');
        $categoria_id = $_POST['categoria_id'] ?? null;
        $is_new       = intval($_POST['is_new'] ?? 0);
        $is_offer     = intval($_POST['is_offer'] ?? 0);
        $activo       = intval($_POST['activo'] ?? 1);

        if ($nombre === '' || $precio <= 0) {
            echo json_encode(['success' => false, 'message' => 'Nombre y precio son obligatorios']);
            exit;
        }

        $hasFlags = tableHasColumn($db, 'productos', 'is_new')
         && tableHasColumn($db, 'productos', 'is_offer');
        // Resolver categoría
        $catId = null;
        if ($categoria_id !== null && is_numeric($categoria_id)) {
            $catId = intval($categoria_id);
        } elseif ($categoria !== '') {
            $stmt = $db->prepare("SELECT id FROM categorias WHERE nombre = :n LIMIT 1");
            $stmt->execute(['n' => $categoria]);
            $cat = $stmt->fetch();
            if ($cat) {
                $catId = intval($cat['id']);
            } else {
                $stmt = $db->prepare("INSERT INTO categorias (nombre) VALUES (:n)");
                $stmt->execute(['n' => $categoria]);
                $catId = intval($db->lastInsertId());
            }
        }

        // Manejar imagen subida con verificación estricta de MIME
        $imagenPath = null;
        if (isset($_FILES['imagen']) && $_FILES['imagen']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = __DIR__ . '/../../img/productos/';
            if (!is_dir($uploadDir)) @mkdir($uploadDir, 0755, true);

            if ($_FILES['imagen']['size'] > 5 * 1024 * 1024) {
                echo json_encode(['success' => false, 'message' => 'La imagen supera los 5MB permitidos']);
                exit;
            }

            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mimeType = finfo_file($finfo, $_FILES['imagen']['tmp_name']);
            finfo_close($finfo);

            $mimeMap = [
                'image/jpeg' => 'jpg',
                'image/png'  => 'png',
                'image/webp' => 'webp',
                'image/gif'  => 'gif'
            ];

            if (!isset($mimeMap[$mimeType])) {
                echo json_encode(['success' => false, 'message' => 'Formato de imagen no permitido. Solo JPG, PNG, WebP o GIF']);
                exit;
            }

            $ext = $mimeMap[$mimeType];
            $fileName = 'prod_' . time() . '_' . bin2hex(random_bytes(8)) . '.' . $ext;
            if (move_uploaded_file($_FILES['imagen']['tmp_name'], $uploadDir . $fileName)) {
                $imagenPath = 'img/productos/' . $fileName;
            }
        }

        // Restaurar producto inactivo si existe con el mismo nombre
        $restaurado = false;
        if ($id <= 0) {
            $stmt = $db->prepare("SELECT id, activo FROM productos WHERE nombre = :n LIMIT 1");
            $stmt->execute(['n' => $nombre]);
            $existing = $stmt->fetch();

            if ($existing && intval($existing['activo']) === 0) {
                $id = intval($existing['id']);
                $activo = 1;
                $restaurado = true;
            } elseif ($existing) {
                echo json_encode(['success' => false, 'message' => 'Ya existe un producto activo con ese nombre']);
                exit;
            }
        }

        // ---------- ACTUALIZAR / RESTAURAR ----------
        if ($id > 0) {
            $imgSql = $imagenPath !== null ? ", imagen_principal = :img" : "";
            $sql = "UPDATE productos
                    SET nombre = :nombre, descripcion = :descripcion, precio = :precio,
                        stock = :stock, categoria_id = :cat, activo = :activo"
                    . ($hasFlags ? ", is_new = :new, is_offer = :offer" : "")
                    . $imgSql . "
                    WHERE id = :id";
            $stmt = $db->prepare($sql);
            $params = [
                'nombre' => $nombre, 'descripcion' => $descripcion, 'precio' => $precio,
                'stock' => $stock, 'cat' => $catId, 'activo' => $activo, 'id' => $id
            ];
            if ($hasFlags) { $params['new'] = $is_new; $params['offer'] = $is_offer; }
            if ($imagenPath !== null) { $params['img'] = $imagenPath; }
            $stmt->execute($params);

            echo json_encode([
                'success' => true,
                'message' => $restaurado ? 'Producto restaurado y actualizado correctamente' : 'Producto actualizado correctamente'
            ]);
            exit;
        }

        // ---------- CREAR ----------
        $sql = "INSERT INTO productos (nombre, descripcion, precio, stock, categoria_id, activo"
             . ($hasFlags ? ", is_new, is_offer" : "")
             . ", imagen_principal)
               VALUES (:nombre, :descripcion, :precio, :stock, :cat, :activo"
             . ($hasFlags ? ", :new, :offer" : "")
             . ", :img)";
        $stmt = $db->prepare($sql);
        $params = [
            'nombre' => $nombre, 'descripcion' => $descripcion, 'precio' => $precio,
            'stock' => $stock, 'cat' => $catId, 'activo' => $activo, 'img' => $imagenPath
        ];
        if ($hasFlags) { $params['new'] = $is_new; $params['offer'] = $is_offer; }
        $stmt->execute($params);

        echo json_encode(['success' => true, 'message' => 'Producto creado correctamente', 'id' => $db->lastInsertId()]);
        exit;
    }

    // ==========================================
    // DELETE: Eliminar con respaldo suave
    // ==========================================
    if ($method === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);
        $id = intval($input['id'] ?? 0);

        if ($id <= 0) {
            echo json_encode(['success' => false, 'message' => 'ID inválido']);
            exit;
        }

        try {
            $stmt = $db->prepare("DELETE FROM productos WHERE id = :id");
            $stmt->execute(['id' => $id]);
            echo json_encode(['success' => true, 'message' => 'Producto eliminado correctamente']);
        } catch (Exception $e) {
            $stmt = $db->prepare("UPDATE productos SET activo = 0 WHERE id = :id");
            $stmt->execute(['id' => $id]);
            echo json_encode(['success' => true, 'message' => 'Producto marcado como inactivo (tiene pedidos asociados)']);
        }
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);

} catch (Exception $e) {
    error_log('Error en products.php: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error del servidor']);
}
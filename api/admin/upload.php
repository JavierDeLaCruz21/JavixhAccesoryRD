<?php
// api/admin/upload.php
header('Content-Type: application/json; charset=utf-8');

require_once '../../config/bootstrap.php';
requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'message' => 'No se recibió ninguna imagen']);
    exit;
}

$uploadDir = __DIR__ . '/../../uploads/products/';
$allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
$maxSize = 5 * 1024 * 1024;

if (!in_array($_FILES['image']['type'], $allowedTypes)) {
    echo json_encode(['success' => false, 'message' => 'Tipo de archivo no permitido. Solo JPG, PNG, WebP o GIF']);
    exit;
}

if ($_FILES['image']['size'] > $maxSize) {
    echo json_encode(['success' => false, 'message' => 'La imagen es demasiado grande. Máximo 5MB']);
    exit;
}

$extension = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
$filename = 'prod_' . time() . '_' . bin2hex(random_bytes(8)) . '.' . $extension;
$filepath = $uploadDir . $filename;

if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

if (move_uploaded_file($_FILES['image']['tmp_name'], $filepath)) {
    $relativeUrl = './uploads/products/' . $filename;
    echo json_encode([
        'success' => true,
        'message' => 'Imagen subida correctamente',
        'url' => $relativeUrl
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'Error al guardar la imagen']);
}
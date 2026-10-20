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
    echo json_encode(['success' => false, 'message' => 'No se recibió ninguna imagen o ocurrió un error al subirla']);
    exit;
}

$uploadDir = __DIR__ . '/../../uploads/products/';
$maxSize = 5 * 1024 * 1024; // 5MB

if ($_FILES['image']['size'] > $maxSize) {
    echo json_encode(['success' => false, 'message' => 'La imagen es demasiado grande. Máximo 5MB']);
    exit;
}

// 1. Verificación estricta de tipo MIME real por bytes (no confiar en $_FILES['image']['type'])
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $_FILES['image']['tmp_name']);
finfo_close($finfo);

$mimeMap = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/webp' => 'webp',
    'image/gif'  => 'gif'
];

if (!isset($mimeMap[$mimeType])) {
    echo json_encode(['success' => false, 'message' => 'Tipo de archivo no permitido. Solo imágenes JPG, PNG, WebP o GIF']);
    exit;
}

// 2. Extensión forzada exclusivamente desde el MIME verificado (evita bypass de doble extensión)
$extension = $mimeMap[$mimeType];
$filename = 'prod_' . time() . '_' . bin2hex(random_bytes(8)) . '.' . $extension;
$filepath = $uploadDir . $filename;

if (!is_dir($uploadDir)) {
    @mkdir($uploadDir, 0755, true);
}

// 3. Crear .htaccess de seguridad en la carpeta uploads para impedir ejecución de scripts PHP
$htaccessFile = __DIR__ . '/../../uploads/.htaccess';
if (!file_exists($htaccessFile)) {
    $htaccessContent = "# Bloquear ejecución de cualquier script en la carpeta de uploads\n"
        . "<FilesMatch \"\\.(php|phtml|php3|php4|php5|php7|phps|phar|inc|cgi|pl|py|sh|asp|aspx)\$\">\n"
        . "    Order Allow,Deny\n"
        . "    Deny from all\n"
        . "</FilesMatch>\n"
        . "Options -Indexes -ExecCGI\n";
    @file_put_contents($htaccessFile, $htaccessContent);
}

if (move_uploaded_file($_FILES['image']['tmp_name'], $filepath)) {
    $relativeUrl = './uploads/products/' . $filename;
    echo json_encode([
        'success' => true,
        'message' => 'Imagen subida correctamente',
        'url' => $relativeUrl
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'Error al guardar la imagen en el servidor']);
}

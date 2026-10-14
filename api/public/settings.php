<?php
// api/public/settings.php
header('Content-Type: application/json; charset=utf-8');

$settingsFile = __DIR__ . '/../../data/settings.json';
$defaults = ['nombre_tienda' => 'Javich AccesoryShop', 'whatsapp' => '18295592331', 'umbral_stock' => 5];

if (is_file($settingsFile)) {
    $data = json_decode(file_get_contents($settingsFile), true);
    if (is_array($data)) $defaults = array_merge($defaults, $data);
}

// Solo exponer campos públicos (no filtraciones)
$public = [
    'nombre_tienda' => $defaults['nombre_tienda'] ?? 'Javich AccesoryShop',
    'whatsapp' => $defaults['whatsapp'] ?? '18295592331'
];

echo json_encode($public);
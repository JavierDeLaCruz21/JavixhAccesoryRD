<?php
// api/auth/callback.php
require_once '../../config/bootstrap.php';
require_once '../../src/Models/User.php';

if (!isset($_GET['code'])) {
    header('Location: ' . APP_URL . '/index.html?error=auth_failed');
    exit;
}

$code = $_GET['code'];

try {
    // Intercambiar código por token
    $tokenUrl = 'https://oauth2.googleapis.com/token';
    $postData = [
        'code' => $code,
        'client_id' => GOOGLE_CLIENT_ID,
        'client_secret' => GOOGLE_CLIENT_SECRET,
        'redirect_uri' => GOOGLE_REDIRECT_URI,
        'grant_type' => 'authorization_code'
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $tokenUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    $response = curl_exec($ch);
    curl_close($ch);

    $tokenData = json_decode($response, true);

    if (!isset($tokenData['access_token'])) {
        throw new Exception('No se pudo obtener el token de acceso');
    }

    // Obtener información del usuario
    $userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $userInfoUrl);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $tokenData['access_token']
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    $userInfo = curl_exec($ch);
    curl_close($ch);

    $userData = json_decode($userInfo, true);

    if (!isset($userData['id'])) {
        throw new Exception('No se pudo obtener la información del usuario');
    }

    // Crear o actualizar usuario
    $userModel = new User();
    $userId = $userModel->createOrUpdateFromGoogle(
        $userData['id'],
        $userData['name'],
        $userData['email'],
        $userData['picture'] ?? null
    );

    $fullUser = $userModel->findById($userId);
    if (!$fullUser) {
        throw new Exception('Usuario no encontrado en la base de datos');
    }

    // Regenerar sesión (evita session fixation)
    session_regenerate_id(true);

    $_SESSION['user_id'] = $fullUser['id'];
    $_SESSION['user_name'] = $fullUser['nombre'];
    $_SESSION['user_email'] = $fullUser['email'];
    $_SESSION['user_role'] = $fullUser['rol'];

    $queryParams = 'login=success'
        . '&name=' . urlencode($fullUser['nombre'])
        . '&email=' . urlencode($fullUser['email'])
        . '&role=' . urlencode($fullUser['rol']);

    header('Location: ' . APP_URL . '/index.html?' . $queryParams);
    exit;

} catch (Exception $e) {
    error_log("Error en callback OAuth: " . $e->getMessage());
    header('Location: ' . APP_URL . '/index.html?error=server_error');
    exit;
}
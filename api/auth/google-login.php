<?php
// api/auth/google-login.php
// Inicia el flujo OAuth con Google de manera segura

require_once '../../config/bootstrap.php';

if (empty(GOOGLE_CLIENT_ID)) {
    header('Location: ' . APP_URL . '/index.html?error=google_not_configured');
    exit;
}

// Token de protección contra CSRF
$state = bin2hex(random_bytes(16));
$_SESSION['oauth_state'] = $state;

$params = [
    'client_id'     => GOOGLE_CLIENT_ID,
    'redirect_uri'  => GOOGLE_REDIRECT_URI,
    'response_type' => 'code',
    'scope'         => 'email profile openid',
    'prompt'        => 'select_account',
    'state'         => $state
];

$authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query($params);
header('Location: ' . $authUrl);
exit;

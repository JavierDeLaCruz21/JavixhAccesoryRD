<?php
// api/cliente/session.php
header('Content-Type: application/json; charset=utf-8');

require_once '../../config/bootstrap.php';

if (isLoggedIn()) {
    echo json_encode([
        'success' => true,
        'user' => [
            'id' => $_SESSION['user_id'],
            'name' => $_SESSION['user_name'] ?? '',
            'email' => $_SESSION['user_email'] ?? '',
            'role' => $_SESSION['user_role'] ?? 'cliente'
        ]
    ]);
} else {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Sesión no activa']);
}
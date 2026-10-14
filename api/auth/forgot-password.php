<?php
// api/auth/forgot-password.php
header('Content-Type: application/json; charset=utf-8');

require_once '../../config/bootstrap.php';
require_once '../../src/Models/User.php';
require_once '../../src/Mailer.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$email = trim($input['email'] ?? '');

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Ingresa un correo válido']);
    exit;
}

try {
    $userModel = new User();
    $user = $userModel->findByEmail($email);

    if ($user) {
        $token = bin2hex(random_bytes(32));
        $expires = date('Y-m-d H:i:s', time() + (RESET_TOKEN_EXPIRY_HOURS * 3600));

        $db = Database::getInstance();
        $stmt = $db->prepare("UPDATE usuarios SET reset_token = :token, reset_token_expires = :expires WHERE id = :id");
        $stmt->execute([
            'token' => $token,
            'expires' => $expires,
            'id' => $user['id']
        ]);

        $resetLink = APP_URL . '/reset-password.html?token=' . $token . '&email=' . urlencode($email);

        $html = '
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Recuperación de Contraseña</h2>
            <p>Hola <strong>' . htmlspecialchars($user['nombre']) . '</strong>,</p>
            <p>Has solicitado restablecer tu contraseña. Haz clic en el botón de abajo:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="' . $resetLink . '" 
                   style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Restablecer Contraseña
                </a>
            </div>
            <p style="word-break: break-all; color: #64748b; font-size: 14px;">' . $resetLink . '</p>
            <p style="color: #64748b; font-size: 14px;">Este enlace expira en ' . RESET_TOKEN_EXPIRY_HOURS . ' hora(s).</p>
            <p style="color: #94a3b8; font-size: 12px;">Si no solicitaste esto, ignora este correo.</p>
        </div>
        ';

        $mailer = new Mailer();
        $emailSent = $mailer->sendHtml($email, 'Recuperación de Contraseña - Javich AccesoryShop', $html);

        if ($emailSent) {
            error_log("✅ Email enviado a: " . $email);
        } else {
            error_log("❌ Error al enviar email a: " . $email);
        }
    }

    echo json_encode([
        'success' => true,
        'message' => 'Si el correo existe, recibirás un enlace de recuperación.'
    ]);

} catch (Exception $e) {
    error_log('Error en forgot-password: ' . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error al procesar la solicitud.'
    ]);
}
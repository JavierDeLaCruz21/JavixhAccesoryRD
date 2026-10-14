<?php
// config/config.php
// Carga de configuración desde .env con fallback a valores por defecto.

declare(strict_types=1);

// ==========================================
// 1. Configuración de errores
// ==========================================
$env = getenv('APP_ENV') ?: 'production';

if ($env === 'development') {
    ini_set('display_errors', '0');
    ini_set('display_startup_errors', '0');
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', '0');
    ini_set('display_startup_errors', '0');
    error_reporting(E_ALL);
}

ini_set('log_errors', '1');

$logsDir = __DIR__ . '/../logs';
if (!is_dir($logsDir)) {
    @mkdir($logsDir, 0775, true);
}
ini_set('error_log', $logsDir . '/php_errors.log');

// ==========================================
// 2. Zona horaria
// ==========================================
date_default_timezone_set('America/Santo_Domingo');

// ==========================================
// 3. Cargador de .env (sin Composer)
// ==========================================
function loadEnv(string $path): void {
    if (!is_file($path)) return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') continue;
        if (strpos($line, '=') === false) continue;
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        if (strlen($value) >= 2) {
            $first = $value[0];
            $last = $value[strlen($value) - 1];
            if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
                $value = substr($value, 1, -1);
            }
        }
        if (!isset($_ENV[$key]) && getenv($key) === false) {
            putenv("$key=$value");
            $_ENV[$key] = $value;
        }
    }
}

loadEnv(__DIR__ . '/.env');

function env(string $key, $default = null) {
    $val = getenv($key);
    if ($val === false || $val === '') return $default;
    if ($val === 'true') return true;
    if ($val === 'false') return false;
    if (is_numeric($val)) return $val + 0;
    return $val;
}

// ==========================================
// 4. Base de datos
// ==========================================
define('DB_HOST', env('DB_HOST', 'localhost'));
define('DB_NAME', env('DB_NAME', 'javich_shop'));
define('DB_USER', env('DB_USER', 'root'));
define('DB_PASS', env('DB_PASS', ''));
define('DB_CHARSET', 'utf8mb4');

// ==========================================
// 5. Aplicación
// ==========================================
define('APP_URL', env('APP_URL', 'http://localhost/javich-shop'));
define('APP_ENV', $env);

// ==========================================
// 6. Google OAuth
// ==========================================
define('GOOGLE_CLIENT_ID', env('GOOGLE_CLIENT_ID', ''));
define('GOOGLE_CLIENT_SECRET', env('GOOGLE_CLIENT_SECRET', ''));
define('GOOGLE_REDIRECT_URI', APP_URL . '/api/auth/callback.php');

// ==========================================
// 7. Resend
// ==========================================
define('RESEND_API_KEY', env('RESEND_API_KEY', ''));
define('RESEND_FROM_EMAIL', env('RESEND_FROM_EMAIL', 'onboarding@resend.dev'));
define('RESEND_FROM_NAME', env('RESEND_FROM_NAME', 'Javich AccesoryShop'));

// ==========================================
// 8. Recuperación de contraseña
// ==========================================
define('RESET_TOKEN_EXPIRY_HOURS', (int) env('RESET_TOKEN_EXPIRY_HOURS', 1));
define('RESET_TOKEN_LENGTH', 64);
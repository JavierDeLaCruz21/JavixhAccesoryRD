<?php
// config/bootstrap.php
// Punto único de arranque para todos los endpoints.
// Uso: require_once '../../config/bootstrap.php';

declare(strict_types=1);

// 1. Configuración (define opciones de sesión ANTES de iniciarla)
require_once __DIR__ . '/config.php';

// 2. Sesión segura
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', '1');
    ini_set('session.cookie_samesite', 'Lax');
    ini_set('session.use_strict_mode', '1');
    ini_set('session.gc_maxlifetime', 7200);

    // En producción con HTTPS, descomenta:
    // ini_set('session.cookie_secure', '1');

    session_start();
}

// 3. Base de datos
require_once __DIR__ . '/../src/Database.php';

// ==========================================
// 4. Helpers de autenticación
// ==========================================
function isLoggedIn(): bool {
    return isset($_SESSION['user_id']);
}

function isAdmin(): bool {
    return isLoggedIn() && strtolower(trim($_SESSION['user_role'] ?? '')) === 'admin';
}

function requireAuth(): void {
    if (!isLoggedIn()) {
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => false, 'message' => 'No autorizado']);
        exit;
    }
}

function requireAdmin(): void {
    if (!isAdmin()) {
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => false, 'message' => 'No autorizado']);
        exit;
    }
}

// ==========================================
// 5. Helpers de esquema (con cache)
// ==========================================
/**
 * Devuelve la lista de columnas de una tabla, cacheada durante el request.
 * Uso: $cols = getTableColumns($db, 'productos');
 */
function getTableColumns(PDO $db, string $table): array {
    static $cache = [];
    if (!isset($cache[$table])) {
        try {
            // ⚠️ $table NUNCA viene de input de usuario, siempre de código.
            $cache[$table] = $db->query("SHOW COLUMNS FROM `$table`")->fetchAll(PDO::FETCH_COLUMN);
        } catch (Throwable $e) {
            error_log("getTableColumns falló para '$table': " . $e->getMessage());
            $cache[$table] = [];
        }
    }
    return $cache[$table];
}

/**
 * Verifica si una columna existe en una tabla (usa el cache de getTableColumns).
 */
function tableHasColumn(PDO $db, string $table, string $column): bool {
    return in_array($column, getTableColumns($db, $table), true);
}
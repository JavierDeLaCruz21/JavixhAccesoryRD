<?php
// src/Database.php
require_once __DIR__ . '/../config/config.php';

class Database {
    private static ?PDO $instance = null;
    
    private function __construct() {}
    private function __clone() {}
    
    public static function getInstance(): PDO {
        if (self::$instance === null) {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::ATTR_PERSISTENT         => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
            ];
            
            try {
                self::$instance = new PDO($dsn, DB_USER, DB_PASS, $options);
            } catch (PDOException $e) {
                error_log("Error de conexión a BD: " . $e->getMessage());
                throw new Exception("Error de conexión a la base de datos. Verifica que MySQL esté corriendo.");
            }
        }
        
        // Verificar que la conexión esté activa
        try {
            self::$instance->query('SELECT 1');
        } catch (PDOException $e) {
            // Reconectar si se perdió la conexión
            self::$instance = null;
            return self::getInstance();
        }
        
        return self::$instance;
    }
    
    public static function resetInstance(): void {
        self::$instance = null;
    }
}
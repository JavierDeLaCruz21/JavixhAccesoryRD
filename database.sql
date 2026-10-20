-- ==========================================================
-- BASE DE DATOS OFICIAL: JavixhAccesoryRD
-- Compatible con MySQL 8.0+ / MariaDB 10.4+ (XAMPP / Producción)
-- Charset: utf8mb4 (Soporte completo de tildes, caracteres especiales y emojis)
-- ==========================================================

CREATE DATABASE IF NOT EXISTS `javich_shop` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `javich_shop`;

SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------
-- 1. TABLA: usuarios
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE `usuarios` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `nombre` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NULL,
    `rol` ENUM('admin', 'cliente') NOT NULL DEFAULT 'cliente',
    `google_id` VARCHAR(100) NULL UNIQUE,
    `avatar` VARCHAR(255) NULL,
    `reset_token` VARCHAR(64) NULL,
    `reset_token_expires` DATETIME NULL,
    `activo` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_email` (`email`),
    INDEX `idx_google_id` (`google_id`),
    INDEX `idx_reset_token` (`reset_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 2. TABLA: categorias
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `categorias`;
CREATE TABLE `categorias` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `nombre` VARCHAR(100) NOT NULL UNIQUE,
    `activo` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 3. TABLA: productos
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `productos`;
CREATE TABLE `productos` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `categoria_id` INT UNSIGNED NULL,
    `nombre` VARCHAR(200) NOT NULL,
    `descripcion` TEXT NULL,
    `precio` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `stock` INT NOT NULL DEFAULT 0,
    `imagen_principal` VARCHAR(255) NULL,
    `is_new` TINYINT(1) NOT NULL DEFAULT 0,
    `is_offer` TINYINT(1) NOT NULL DEFAULT 0,
    `activo` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_productos_categoria` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_cat_activo` (`categoria_id`, `activo`),
    INDEX `idx_stock` (`stock`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 4. TABLA: pedidos
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `pedidos`;
CREATE TABLE `pedidos` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `usuario_id` INT UNSIGNED NOT NULL,
    `total` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `estado` ENUM('pendiente', 'verificando_pago', 'preparando', 'listo_entrega', 'entregado', 'cancelado') NOT NULL DEFAULT 'pendiente',
    `estado_pago` ENUM('pendiente_pago', 'pagado', 'expirado') NOT NULL DEFAULT 'pendiente_pago',
    `fecha_pedido` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `fecha_expiracion` DATETIME NOT NULL,
    CONSTRAINT `fk_pedidos_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_usuario_pedido` (`usuario_id`),
    INDEX `idx_estado_expiracion` (`estado_pago`, `fecha_expiracion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 5. TABLA: pedido_detalle
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `pedido_detalle`;
CREATE TABLE `pedido_detalle` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `pedido_id` INT UNSIGNED NOT NULL,
    `producto_id` INT UNSIGNED NULL,
    `cantidad` INT UNSIGNED NOT NULL DEFAULT 1,
    `precio_unitario` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    CONSTRAINT `fk_detalle_pedido` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_detalle_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_pedido_id` (`pedido_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 6. TABLA: bancos (Cuentas para transferencias de pago)
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `bancos`;
CREATE TABLE `bancos` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `nombre` VARCHAR(100) NOT NULL,
    `tipo_cuenta` VARCHAR(50) NOT NULL DEFAULT 'Ahorros',
    `numero_cuenta` VARCHAR(50) NOT NULL,
    `titular` VARCHAR(150) NOT NULL,
    `logo` VARCHAR(255) NULL,
    `activo` TINYINT(1) NOT NULL DEFAULT 1,
    `orden` INT NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ==========================================================
-- DATOS INICIALES (SEMILLAS / SEEDS)
-- ==========================================================

-- 1. Usuario Administrador por defecto
-- Correo: admin@javich.com
-- Contraseña temporal: Admin123* (bcrypt hash generado de forma segura)
INSERT INTO `usuarios` (`nombre`, `email`, `password_hash`, `rol`, `activo`)
VALUES ('Administrador Javich', 'admin@javich.com', '$2y$10$wN9aR5s8pL9s6a0t7u3vZeM9.GjG5c8Q4v2R0Z9L2v1T0.z4oE6/m', 'admin', 1)
ON DUPLICATE KEY UPDATE `rol` = 'admin';

-- 2. Categorías principales
INSERT INTO `categorias` (`id`, `nombre`, `activo`) VALUES
(1, 'Apple', 1),
(2, 'Samsung', 1),
(3, 'Anker', 1),
(4, 'Accesorios', 1)
ON DUPLICATE KEY UPDATE `activo` = 1;

-- 3. Cuentas bancarias de ejemplo (República Dominicana)
INSERT INTO `bancos` (`id`, `nombre`, `tipo_cuenta`, `numero_cuenta`, `titular`, `logo`, `activo`, `orden`) VALUES
(1, 'Banreservas', 'Ahorros', '960-123456-7', 'Javier De La Cruz / Javich Accessory RD', './img/slide-apple.png', 1, 1),
(2, 'Banco Popular Dominicano', 'Ahorros', '801-987654-3', 'Javier De La Cruz / Javich Accessory RD', './img/slide-samsung.png', 1, 2),
(3, 'Banco BHD', 'Ahorros', '250-456789-1', 'Javier De La Cruz / Javich Accessory RD', './img/slide-anker.png', 1, 3)
ON DUPLICATE KEY UPDATE `activo` = 1;

-- 4. Productos de catálogo inicial
INSERT INTO `productos` (`categoria_id`, `nombre`, `descripcion`, `precio`, `stock`, `imagen_principal`, `is_new`, `is_offer`, `activo`) VALUES
(1, 'Cargador Rápido 20W Apple USB-C Original', 'Adaptador de corriente USB-C de 20 W para carga rápida de iPhone 11 al 16 Pro Max.', 1450.00, 25, './img/slide-apple.png', 1, 0, 1),
(1, 'Cable USB-C a Lightning Apple (1m)', 'Cable original para carga y sincronización de dispositivos Apple con puerto Lightning.', 950.00, 30, './img/slide-apple.png', 0, 1, 1),
(2, 'Cargador Samsung Super Fast 25W Type-C', 'Carga ultra rápida para Samsung Galaxy S21, S22, S23, S24 y línea Serie A.', 1250.00, 20, './img/slide-samsung.png', 1, 0, 1),
(2, 'Cable Samsung Type-C a Type-C Original', 'Cable de alta resistencia y transmisión de datos de alta velocidad.', 750.00, 35, './img/slide-samsung.png', 0, 0, 1),
(3, 'Power Bank Anker 10,000mAh PowerCore', 'Batería portátil ultra compacta con tecnología PowerIQ de carga inteligente.', 2200.00, 15, './img/slide-anker.png', 1, 1, 1),
(3, 'Audífonos Anker Soundcore Life P2 Mini', 'Sonido potente con graves increíbles, hasta 32 horas de batería y resistencia IPX5.', 2650.00, 12, './img/slide-anker.png', 1, 0, 1),
(4, 'Protector de Pantalla Cerámica Full Cover', 'Mica de cerámica mate irrompible contra golpes y caídas para iPhone y Samsung.', 450.00, 50, './img/android-chrome-192x192.png', 0, 1, 1);

# 🛍️ Javich AccesoryShop

E-commerce completo para venta de accesorios tecnológicos (Apple, Samsung, Anker), con catálogo público, panel de administración, área de cliente y flujo de pago por transferencia bancaria.

![PHP](https://img.shields.io/badge/PHP-8.2-777BB4?logo=php)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript)

---

## ✨ Features

### 🛒 Tienda pública
- Catálogo con búsqueda y filtros por categoría
- Carrusel promocional dinámico
- Carrito persistente (localStorage)
- Modo oscuro/claro persistente
- Diseño 100% responsive

### 🔐 Autenticación
- Registro con email + contraseña
- Login con Google OAuth 2.0
- Recuperación de contraseña por email (Resend)
- Rate limiting en login (5 intentos / 15 min)
- Validación estricta server-side

### 👤 Panel de Cliente
- Dashboard con estadísticas
- Historial de pedidos con cronómetros en vivo
- Edición de perfil y cambio de contraseña
- Descarga de facturas en PDF

### 🛡️ Panel de Administración
- Dashboard con KPIs
- CRUD completo de productos con subida de imágenes
- Gestión de pedidos y usuarios
- Configuración de tienda

### 💳 Flujo de Pago
- Selección de banco para transferencia
- Temporizador de 72h para completar el pago
- Copiado de número de cuenta con fallback universal
- Envío de voucher por WhatsApp
- Expiración automática de pedidos vencidos (cron)

---

## 🛠️ Stack Técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML5, CSS3, JavaScript vanilla (ES6+) |
| Backend | PHP 8.2 (sin frameworks), PDO |
| Base de datos | MySQL 8 |
| Autenticación | Google Identity OAuth 2.0 |
| Email | Resend API |
| PDF | jsPDF + html2canvas |

---

## 🏗️ Arquitectura

javich-shop/
├── api/ # Endpoints REST (JSON)
│ ├── admin/ # Dashboard, productos, pedidos, usuarios
│ ├── auth/ # Login, registro, recuperación, OAuth
│ ├── cliente/ # Perfil, pedidos, facturas
│ ├── cron/ # Tareas automáticas
│ └── public/ # Productos, checkout, bancos
├── config/ # Configuración + bootstrap
├── src/ # Clases (Database, Mailer, Models)
├── data/ # settings.json
├── img/ # Assets estáticos
├── uploads/ # Imágenes subidas
└── *.html # Vistas
<?php
// src/Models/User.php
declare(strict_types=1);

require_once __DIR__ . '/../Database.php';

class User {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Detecta si una columna existe en la tabla usuarios
     */
    private function columnExists(string $column): bool {
        static $cache = [];
        if (!isset($cache[$column])) {
            $cols = $this->db->query("SHOW COLUMNS FROM usuarios")->fetchAll(PDO::FETCH_COLUMN);
            $cache[$column] = in_array($column, $cols);
        }
        return $cache[$column];
    }

    public function findByEmail(string $email): ?array {
        $hasGoogleId = $this->columnExists('google_id');

        $cols = 'id, nombre, email, password_hash, rol, activo';
        if ($hasGoogleId) $cols .= ', google_id';

        $stmt = $this->db->prepare("SELECT $cols FROM usuarios WHERE email = :email LIMIT 1");
        $stmt->execute(['email' => $email]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    public function findByGoogleId(string $googleId): ?array {
        if (!$this->columnExists('google_id')) return null;

        $stmt = $this->db->prepare("SELECT id, nombre, email, google_id, rol, activo FROM usuarios WHERE google_id = :google_id LIMIT 1");
        $stmt->execute(['google_id' => $googleId]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    public function findById(int $id): ?array {
        $stmt = $this->db->prepare("SELECT id, nombre, email, rol, activo FROM usuarios WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    public function create(string $nombre, string $email, string $passwordHash): bool {
        $stmt = $this->db->prepare("INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (:nombre, :email, :password_hash, 'cliente')");
        return $stmt->execute([
            'nombre' => $nombre,
            'email' => $email,
            'password_hash' => $passwordHash
        ]);
    }

    public function createOrUpdateFromGoogle(string $googleId, string $nombre, string $email, ?string $avatar): int {
        if (!$this->columnExists('google_id')) {
            throw new Exception('La columna google_id no existe en la tabla usuarios');
        }

        // 1. Buscar si ya tiene google_id vinculado
        $user = $this->findByGoogleId($googleId);
        if ($user) return (int)$user['id'];

        // 2. Si ya existe un usuario con ese email, vincular su google_id
        $existingByEmail = $this->findByEmail($email);
        $hasAvatar = $this->columnExists('avatar');

        if ($existingByEmail) {
            $updateSql = "UPDATE usuarios SET google_id = :google_id";
            $params = ['google_id' => $googleId, 'id' => $existingByEmail['id']];
            if ($hasAvatar && !empty($avatar)) {
                $updateSql .= ", avatar = :avatar";
                $params['avatar'] = $avatar;
            }
            $updateSql .= " WHERE id = :id";
            $stmt = $this->db->prepare($updateSql);
            $stmt->execute($params);
            return (int)$existingByEmail['id'];
        }

        // 3. Si no existe, crear nuevo registro
        if ($hasAvatar) {
            $stmt = $this->db->prepare("INSERT INTO usuarios (google_id, nombre, email, avatar, rol) VALUES (:google_id, :nombre, :email, :avatar, 'cliente')");
            $stmt->execute([
                'google_id' => $googleId,
                'nombre' => $nombre,
                'email' => $email,
                'avatar' => $avatar
            ]);
        } else {
            $stmt = $this->db->prepare("INSERT INTO usuarios (google_id, nombre, email, rol) VALUES (:google_id, :nombre, :email, 'cliente')");
            $stmt->execute([
                'google_id' => $googleId,
                'nombre' => $nombre,
                'email' => $email
            ]);
        }

        return (int)$this->db->lastInsertId();
    }
}
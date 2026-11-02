<?php
declare(strict_types=1);

$envPath = dirname(__DIR__).'/.env';
$settings = is_file($envPath) ? parse_ini_file($envPath, false, INI_SCANNER_RAW) : [];
if ($settings === false) {
    throw new RuntimeException('Could not read backend/.env.');
}

$host = $settings['DB_HOST'] ?? '127.0.0.1';
$port = $settings['DB_PORT'] ?? '3306';
$name = $settings['DB_NAME'] ?? 'cihrm_db';
$user = $settings['DB_USER'] ?? 'root';
$password = $settings['DB_PASSWORD'] ?? '';

return new PDO(
    "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4",
    $user,
    $password,
    [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]
);

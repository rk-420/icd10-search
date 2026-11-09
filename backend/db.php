<?php
// Creates and returns a PDO connection to MySQL.
// Connection data comes from environment variables (set in docker-compose.yml),
// so no passwords are hard-coded and the DB server can be changed without code changes.

$host = getenv('DB_HOST');
$name = getenv('DB_NAME');
$user = getenv('DB_USER');
$pass = getenv('DB_PASSWORD');

$dsn = "mysql:host=$host;dbname=$name;charset=utf8mb4";

return new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // throw exceptions on SQL errors
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // rows as ['code' => ..., 'title' => ...]
]);

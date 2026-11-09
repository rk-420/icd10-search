<?php
// Search API: GET /search.php?q=chol
// Returns a JSON array like [{"code": "A00.-", "title": "Cholera"}, ...]

header('Content-Type: application/json; charset=utf-8');

// Read the search text. Only accept a string (?q[]=x would give an array).
$q = is_string($_GET['q'] ?? null) ? trim($_GET['q']) : '';

// Too short: one letter would match thousands of rows, so return nothing.
if (mb_strlen($q) < 2) {
    echo '[]';
    exit;
}

// In LIKE, "%" and "_" are wildcards. Escape them (and the escape char "!" itself)
// so that the user's input is searched literally.
$escaped = str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $q);

$sql = "
    SELECT code, title
    FROM diagnoses
    WHERE code LIKE :code_prefix ESCAPE '!'
       OR title LIKE :title_contains ESCAPE '!'
    ORDER BY
        CASE
            WHEN code  LIKE :code_prefix2 ESCAPE '!' THEN 0  -- code starts with query
            WHEN title LIKE :title_prefix ESCAPE '!' THEN 1  -- title starts with query
            ELSE 2                                           -- query somewhere in title
        END,
        code
    LIMIT 50
";

try {
    $pdo  = require __DIR__ . '/db.php';
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':code_prefix'    => $escaped . '%',
        ':title_contains' => '%' . $escaped . '%',
        ':code_prefix2'   => $escaped . '%',
        ':title_prefix'   => $escaped . '%',
    ]);

    // JSON_UNESCAPED_UNICODE outputs umlauts (ä, ö, ü) as real characters, not as escape codes.
    echo json_encode($stmt->fetchAll(), JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    // Log the real error for us, but don't show internal details to the client.
    error_log($e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Die Suche ist derzeit nicht verfügbar.'], JSON_UNESCAPED_UNICODE);
}

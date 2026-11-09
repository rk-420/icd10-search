<?php
// Imports the BfArM ICD-10-GM 2025 file into the "diagnoses" table.
// Run: docker compose exec backend php import.php

// This script must not be callable from the browser.
if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('Forbidden');
}

$pdo  = require __DIR__ . '/db.php';
$file = '/data/icd10gm2025syst_kodes.txt';

$handle = fopen($file, 'r');
if ($handle === false) {
    exit("Cannot open $file\n");
}

// Start from an empty table, so the import can be run again safely.
$pdo->exec('TRUNCATE TABLE diagnoses');

$stmt = $pdo->prepare('INSERT INTO diagnoses (code, title) VALUES (:code, :title)');

// One transaction: much faster than 16,817 single commits, and all-or-nothing.
$pdo->beginTransaction();
$count = 0;

try {
    // Split on ";" only. Titles contain commas, so we must not split on ",".
    while (($row = fgetcsv($handle, null, ';', '"', '')) !== false) {
        if (count($row) < 9) {
            continue; // empty or broken line
        }

        $stmt->execute([
            ':code'  => trim($row[5]), // column 6: unique code
            ':title' => trim($row[8]), // column 9: diagnosis title
        ]);
        $count++;
    }

    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    exit('Import failed: ' . $e->getMessage() . "\n");
} finally {
    fclose($handle);
}

echo "Imported $count diagnoses\n";

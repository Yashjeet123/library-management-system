<?php

declare(strict_types=1);

spl_autoload_register(function ($class) {
    $prefix = '';
    $base_dir = __DIR__ . '/src/';
    $file = $base_dir . str_replace('\\', '/', $class) . '.php';
    if (file_exists($file)) require_once $file;
});

header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'getSampleData':
        $file = __DIR__ . '/data/sample-data.json';
        if (!file_exists($file)) {
            echo json_encode(['success' => false, 'message' => 'Sample data not found']);
            exit;
        }
        $json = file_get_contents($file);
        $data = json_decode($json, true);
        echo json_encode(['success' => true, 'data' => $data]);
        break;

    case 'getItems':
        $file = __DIR__ . '/data/sample-data.json';
        $json = file_exists($file) ? file_get_contents($file) : '{}';
        $data = json_decode($json, true);
        echo json_encode(['success' => true, 'data' => $data['items'] ?? []]);
        break;

    case 'getUsers':
        $file = __DIR__ . '/data/sample-data.json';
        $json = file_exists($file) ? file_get_contents($file) : '{}';
        $data = json_decode($json, true);
        echo json_encode(['success' => true, 'data' => $data['users'] ?? []]);
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

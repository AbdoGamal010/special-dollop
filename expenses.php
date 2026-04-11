<?php
require_once 'config.php';
session_start();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

if (!isset($_SESSION['logged_in'])) {
    json_out(['ok' => false, 'msg' => 'غير مصرح'], 401);
}

$input  = get_input();
$action = $input['action'] ?? '';

// ===== LIST =====
if ($action === 'list') {
    $date = $input['date'] ?? date('Y-m-d');
    $stmt = $pdo->prepare('SELECT * FROM expenses WHERE date = ? ORDER BY id DESC');
    $stmt->execute([$date]);
    json_out(['ok' => true, 'data' => $stmt->fetchAll()]);
}

// ===== ADD =====
if ($action === 'add') {
    $name   = trim($input['name']   ?? '');
    $amount = (float)($input['amount'] ?? 0);
    $note   = trim($input['note']   ?? '');

    if (!$name)       json_out(['ok' => false, 'msg' => 'أدخل اسم المصروف']);
    if ($amount < 1)  json_out(['ok' => false, 'msg' => 'أدخل مبلغ صحيح']);

    $stmt = $pdo->prepare('INSERT INTO expenses (name, amount, note, date) VALUES (?, ?, ?, ?)');
    $stmt->execute([$name, $amount, $note, date('Y-m-d')]);
    json_out(['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
}

// ===== DELETE =====
if ($action === 'delete') {
    $id = (int)($input['id'] ?? 0);
    if (!$id) json_out(['ok' => false, 'msg' => 'id ناقص']);

    $pdo->prepare('DELETE FROM expenses WHERE id = ?')->execute([$id]);
    json_out(['ok' => true]);
}

json_out(['ok' => false, 'msg' => 'action غير معروف'], 400);
?>

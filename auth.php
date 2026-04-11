<?php
require_once 'config.php';
session_start();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

$input  = get_input();
$action = $input['action'] ?? '';

// ===== LOGIN =====
if ($action === 'login') {
    $password = trim($input['password'] ?? '');

    $cfg = $pdo->query('SELECT skey, sval FROM settings')->fetchAll(PDO::FETCH_KEY_PAIR);

    if (!isset($cfg['password'])) {
        json_out(['ok' => false, 'msg' => 'إعدادات النظام غير مكتملة، تأكد من تشغيل setup.sql']);
    }

    if ($password === $cfg['password']) {
        $_SESSION['logged_in'] = true;
        json_out([
            'ok'       => true,
            'settings' => [
                'rate'  => (float)($cfg['rate']  ?? 20),
                'drink' => (float)($cfg['drink'] ?? 15),
                'chips' => (float)($cfg['chips'] ?? 10),
                'choc'  => (float)($cfg['choc']  ?? 10),
            ]
        ]);
    } else {
        json_out(['ok' => false, 'msg' => 'كلمة السر غلط، حاول مرة تانية']);
    }
}

// ===== LOGOUT =====
if ($action === 'logout') {
    session_destroy();
    json_out(['ok' => true]);
}

// ===== CHECK SESSION =====
if ($action === 'check') {
    json_out(['ok' => isset($_SESSION['logged_in'])]);
}

json_out(['ok' => false, 'msg' => 'action غير معروف'], 400);
?>

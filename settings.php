<?php
require_once 'config.php';
session_start();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

if (!isset($_SESSION['logged_in'])) {
    json_out(['ok' => false, 'msg' => 'غير مصرح'], 401);
}

$input  = get_input();
$action = $input['action'] ?? '';

// ===== GET SETTINGS =====
if ($action === 'get') {
    $cfg = $pdo->query('SELECT skey, sval FROM settings')->fetchAll(PDO::FETCH_KEY_PAIR);
    // لا نرجع الباسورد للفرونت اند
    unset($cfg['password']);
    json_out(['ok' => true, 'data' => $cfg]);
}

// ===== SAVE SETTINGS =====
if ($action === 'save') {
    $rate  = (float)($input['rate']  ?? 0);
    $drink = (float)($input['drink'] ?? 0);
    $chips = (float)($input['chips'] ?? 0);
    $choc  = (float)($input['choc']  ?? 0);

    if ($rate < 1 || $drink < 1 || $chips < 1 || $choc < 1) {
        json_out(['ok' => false, 'msg' => 'تحقق من الأسعار، يجب أن تكون أكبر من صفر']);
    }

    $stmt = $pdo->prepare('UPDATE settings SET sval = ? WHERE skey = ?');
    foreach (['rate' => $rate, 'drink' => $drink, 'chips' => $chips, 'choc' => $choc] as $k => $v) {
        $stmt->execute([$v, $k]);
    }

    // تغيير كلمة السر إذا طُلب
    if (!empty($input['new_password'])) {
        $oldPw = $input['old_password'] ?? '';
        $newPw = $input['new_password'];

        $cfg = $pdo->query('SELECT skey, sval FROM settings')->fetchAll(PDO::FETCH_KEY_PAIR);
        if ($oldPw !== $cfg['password']) {
            json_out(['ok' => false, 'msg' => 'كلمة السر الحالية غلط']);
        }
        if (strlen($newPw) < 4) {
            json_out(['ok' => false, 'msg' => 'الكلمة الجديدة 4 أحرف على الأقل']);
        }
        $stmt->execute([$newPw, 'password']);
    }

    json_out(['ok' => true]);
}

json_out(['ok' => false, 'msg' => 'action غير معروف'], 400);
?>

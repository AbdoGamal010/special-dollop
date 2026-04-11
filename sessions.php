<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

$input  = get_input();
$action = $input['action'] ?? '';

// ===== START SESSION =====
if ($action === 'start') {
    $device_id = (int)($input['device_id'] ?? 0);
    $rate      = (float)($input['rate'] ?? 0);
    if (!$device_id || !$rate) json_out(['ok' => false, 'msg' => 'بيانات ناقصة']);

    $check = $pdo->prepare('SELECT id FROM sessions WHERE device_id = ? AND ended_at IS NULL');
    $check->execute([$device_id]);
    if ($check->fetch()) json_out(['ok' => false, 'msg' => 'الجهاز شغال بالفعل']);

    $stmt = $pdo->prepare('INSERT INTO sessions (device_id, started_at, rate) VALUES (?, NOW(), ?)');
    $stmt->execute([$device_id, $rate]);
    json_out(['ok' => true, 'session_id' => (int)$pdo->lastInsertId()]);
}

// ===== STOP SESSION =====
if ($action === 'stop') {
    $session_id = (int)($input['session_id'] ?? 0);
    $cons_drink = (int)($input['cons_drink'] ?? 0);
    $cons_chips = (int)($input['cons_chips'] ?? 0);
    $cons_choc  = (int)($input['cons_choc']  ?? 0);
    if (!$session_id) json_out(['ok' => false, 'msg' => 'session_id ناقص']);

    $stmt = $pdo->prepare('SELECT * FROM sessions WHERE id = ? AND ended_at IS NULL');
    $stmt->execute([$session_id]);
    $s = $stmt->fetch();
    if (!$s) json_out(['ok' => false, 'msg' => 'الجلسة مش موجودة أو خلصت']);

    $secs      = time() - strtotime($s['started_at']);
    $time_cost = round(($secs / 3600) * $s['rate'], 2);

    $cfg = $pdo->query('SELECT skey, sval FROM settings')->fetchAll(PDO::FETCH_KEY_PAIR);
    $cons_cost = ($cons_drink * (float)$cfg['drink'])
               + ($cons_chips * (float)$cfg['chips'])
               + ($cons_choc  * (float)$cfg['choc']);
    $total = $time_cost + $cons_cost;

    $upd = $pdo->prepare('UPDATE sessions SET
        ended_at=NOW(), duration_s=?, time_cost=?,
        cons_drink=?, cons_chips=?, cons_choc=?, cons_cost=?, total=?
        WHERE id=?');
    $upd->execute([$secs, $time_cost, $cons_drink, $cons_chips, $cons_choc, $cons_cost, $total, $session_id]);

    json_out(['ok' => true, 'data' => [
        'duration_s' => $secs,
        'time_cost'  => $time_cost,
        'cons_cost'  => $cons_cost,
        'total'      => $total,
    ]]);
}

// ===== GET ACTIVE SESSIONS =====
if ($action === 'active') {
    $rows = $pdo->query('SELECT s.id, s.device_id, s.started_at, s.rate,
        s.cons_drink, s.cons_chips, s.cons_choc,
        d.name as device_name
        FROM sessions s JOIN devices d ON d.id = s.device_id
        WHERE s.ended_at IS NULL')->fetchAll();
    json_out(['ok' => true, 'data' => $rows]);
}

// ===== GET HISTORY =====
if ($action === 'history') {
    // يدعم يوم محدد أو شهر كامل
    $date  = $input['date']  ?? null;
    $month = $input['month'] ?? null; // صيغة YYYY-MM

    if ($month) {
        // كل الجلسات في شهر معين
        $rows = $pdo->prepare('SELECT s.*, d.name as device_name
            FROM sessions s JOIN devices d ON d.id = s.device_id
            WHERE DATE_FORMAT(s.started_at, "%Y-%m") = ? AND s.ended_at IS NOT NULL
            ORDER BY s.ended_at DESC');
        $rows->execute([$month]);
    } else {
        // يوم محدد (افتراضي: اليوم)
        $date = $date ?? date('Y-m-d');
        $rows = $pdo->prepare('SELECT s.*, d.name as device_name
            FROM sessions s JOIN devices d ON d.id = s.device_id
            WHERE DATE(s.started_at) = ? AND s.ended_at IS NOT NULL
            ORDER BY s.ended_at DESC');
        $rows->execute([$date]);
    }

    json_out(['ok' => true, 'data' => $rows->fetchAll()]);
}

json_out(['ok' => false, 'msg' => 'action غير معروف'], 400);
?>

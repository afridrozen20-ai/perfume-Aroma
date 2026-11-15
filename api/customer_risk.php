<?php
/** Customer history (from our own orders) and the phone block list. */

function normPhone(string $p): string {
    $d = preg_replace('/\D+/', '', $p);
    if (strlen($d) >= 11) $d = substr($d, -11);      // 8801XXXXXXXXX → 01XXXXXXXXX
    if (strlen($d) === 10 && $d[0] === '1') $d = '0' . $d;
    return $d;
}

function ensureBlockTable(PDO $db): void {
    static $done = false;
    if ($done) return;
    $done = true;
    try { $db->query("SELECT phone FROM blocked_phones LIMIT 1"); return; } catch (Throwable $e) {}
    $isSqlite = $db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
    try {
        $db->exec($isSqlite
            ? "CREATE TABLE IF NOT EXISTS blocked_phones (phone TEXT PRIMARY KEY, name TEXT, reason TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
            : "CREATE TABLE IF NOT EXISTS blocked_phones (phone VARCHAR(20) NOT NULL PRIMARY KEY, name VARCHAR(150) NULL, reason VARCHAR(255) NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP) DEFAULT CHARSET=utf8mb4");
    } catch (Throwable $e) {}
}

/** @return array<string, array{reason:?string, created_at:?string}> keyed by normalised phone */
function blockedMap(PDO $db): array {
    ensureBlockTable($db);
    $out = [];
    try {
        foreach ($db->query("SELECT phone, reason, created_at FROM blocked_phones")->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $out[normPhone((string)$r['phone'])] = ['reason' => $r['reason'], 'created_at' => $r['created_at']];
        }
    } catch (Throwable $e) {}
    return $out;
}

function isPhoneBlocked(PDO $db, string $phone): bool {
    $n = normPhone($phone);
    if ($n === '') return false;
    return isset(blockedMap($db)[$n]);
}

/**
 * Our own history per phone: orders, delivered, cancelled (before sending), returned (cancelled after it was shipped).
 * @return array<string, array{orders:int, delivered:int, cancelled:int, returned:int, open:int}>
 */
function phoneHistory(PDO $db): array {
    $out = [];
    $rows = $db->query("SELECT id, customer_phone, order_status, tracking_number FROM orders")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as $r) {
        $p = normPhone((string)$r['customer_phone']);
        if ($p === '') continue;
        if (!isset($out[$p])) $out[$p] = ['orders' => 0, 'delivered' => 0, 'cancelled' => 0, 'returned' => 0, 'open' => 0];
        $out[$p]['orders']++;
        $s = $r['order_status'];
        if ($s === 'delivered') $out[$p]['delivered']++;
        elseif ($s === 'cancelled') { if (!empty($r['tracking_number'])) $out[$p]['returned']++; else $out[$p]['cancelled']++; }
        else $out[$p]['open']++;
    }
    return $out;
}

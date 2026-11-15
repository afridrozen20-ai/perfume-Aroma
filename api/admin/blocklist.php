<?php
/**
 * Admin: blocked phone numbers (fake / repeat-return customers).
 * GET                         -> [{ phone, name, reason, created_at }]
 * GET  ?phone=01XXXXXXXXX     -> { blocked, reason, history }
 * POST { action: "block", phone, name?, reason? }
 * POST { action: "unblock", phone }
 */
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../customer_risk.php';

sendCorsAndHeaders();
$admin = requireAdminAuth();
$db = Database::getConnection();
ensureBlockTable($db);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    if (isset($_GET['phone'])) {
        $p = normPhone((string)$_GET['phone']);
        $map = blockedMap($db);
        $hist = phoneHistory($db)[$p] ?? ['orders' => 0, 'delivered' => 0, 'cancelled' => 0, 'returned' => 0, 'open' => 0];
        jsonResponse(['phone' => $p, 'blocked' => isset($map[$p]), 'reason' => $map[$p]['reason'] ?? null, 'history' => $hist]);
    }
    $rows = $db->query("SELECT phone, name, reason, created_at FROM blocked_phones ORDER BY created_at DESC")->fetchAll(PDO::FETCH_ASSOC);
    jsonResponse($rows);
}

if ($method !== 'POST') jsonError('Method not allowed', 405);
$in = getJsonInput() ?: [];
$action = (string)($in['action'] ?? '');
$p = normPhone((string)($in['phone'] ?? ''));
if (!preg_match('/^01\d{9}$/', $p)) jsonError('Enter a valid Bangladeshi mobile number.', 422);

if ($action === 'block') {
    $name = mb_substr(trim((string)($in['name'] ?? '')), 0, 150);
    $reason = mb_substr(trim((string)($in['reason'] ?? '')), 0, 255);
    $db->prepare("DELETE FROM blocked_phones WHERE phone = ?")->execute([$p]);
    $db->prepare("INSERT INTO blocked_phones (phone, name, reason) VALUES (?, ?, ?)")->execute([$p, $name ?: null, $reason ?: null]);
    try { $db->prepare("INSERT INTO audit_logs (user_id, action, entity, details) VALUES (?, 'block_phone', 'blocked_phones', ?)")->execute([$admin['id'], "Blocked $p"]); } catch (Throwable $e) {}
    jsonResponse(['phone' => $p, 'blocked' => true]);
}
if ($action === 'unblock') {
    $db->prepare("DELETE FROM blocked_phones WHERE phone = ?")->execute([$p]);
    try { $db->prepare("INSERT INTO audit_logs (user_id, action, entity, details) VALUES (?, 'unblock_phone', 'blocked_phones', ?)")->execute([$admin['id'], "Unblocked $p"]); } catch (Throwable $e) {}
    jsonResponse(['phone' => $p, 'blocked' => false]);
}
jsonError('Unknown action', 400);

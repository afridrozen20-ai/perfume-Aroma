<?php
/**
 * Cancel an order from the Today board, optionally putting its ml back in stock.
 * POST { id, restore: bool, reason?: string }
 *  - Not cancelled yet  → cancels it; restores ml if restore = true
 *  - Already cancelled (e.g. a Steadfast return) → restores ml if restore = true (never twice)
 */
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../inventory_helpers.php';

sendCorsAndHeaders();
$admin = requireAdminAuth();
$db = Database::getConnection();
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') jsonError('Method not allowed', 405);

$in = getJsonInput() ?: [];
$id = (int)($in['id'] ?? 0);
$restore = !empty($in['restore']);
$reason = mb_substr(trim((string)($in['reason'] ?? '')), 0, 200);
if ($id <= 0) jsonError('Order not found', 404);

$st = $db->prepare("SELECT * FROM orders WHERE id = ? LIMIT 1");
$st->execute([$id]);
$o = $st->fetch(PDO::FETCH_ASSOC);
if (!$o) jsonError('Order not found', 404);

$by = $admin['username'] ?? ('admin:' . $admin['id']);
$wasCancelled = $o['order_status'] === 'cancelled';
$restoredMl = 0.0;
$already = false;

try {
    $db->beginTransaction();

    if ($restore) {
        $r = restoreInventoryForOrder($db, $id, 'order_cancellation', $by);
        $already = !empty($r['already_restored']);
        foreach (($r['restored'] ?? []) as $x) $restoredMl += (float)($x['restored_ml'] ?? $x['change_ml'] ?? 0);
        // Unit stock too, only when ml was actually put back just now
        if (!$already && !empty($r['restored'])) {
            $items = $db->prepare("SELECT product_id, selected_size, quantity FROM order_items WHERE order_id = ?");
            $items->execute([$id]);
            $v = $db->prepare("UPDATE product_variants SET stock_qty = stock_qty + ? WHERE product_id = ? AND size = ?");
            $p = $db->prepare("UPDATE products SET inventory_qty = inventory_qty + ? WHERE id = ?");
            foreach ($items->fetchAll(PDO::FETCH_ASSOC) as $it) {
                try { $v->execute([$it['quantity'], $it['product_id'], $it['selected_size']]); $p->execute([$it['quantity'], $it['product_id']]); } catch (Throwable $e) {}
            }
        }
    }

    if (!$wasCancelled) {
        $db->prepare("UPDATE orders SET order_status = 'cancelled' WHERE id = ?")->execute([$id]);
    }
    $note = ($wasCancelled ? 'Return handled' : 'Cancelled from Today')
        . ($reason !== '' ? " · $reason" : '')
        . ($restore ? ($already ? ' · ml was already back in stock' : ' · ml put back in stock') : ' · ml kept out of stock');
    try {
        $db->prepare("INSERT INTO order_status_history (order_id, old_status, new_status, note, changed_by) VALUES (?, ?, 'cancelled', ?, ?)")
           ->execute([$id, $o['order_status'], $note, $by]);
    } catch (Throwable $e) {}

    $db->commit();
} catch (Throwable $e) {
    if ($db->inTransaction()) $db->rollBack();
    jsonError('Could not cancel this order: ' . $e->getMessage(), 500);
}

jsonResponse(['id' => $id, 'cancelled' => true, 'restored' => $restore && !$already, 'already_restored' => $already, 'restored_ml' => round($restoredMl, 2), 'tracking' => $o['tracking_number'] ?? null]);

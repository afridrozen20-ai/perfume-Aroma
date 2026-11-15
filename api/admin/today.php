<?php
/**
 * Admin "Today" board — one call for the morning view.
 * GET -> {
 *   counts: { new, to_pack, shipped_today, unpaid_advance },
 *   new_orders:   [order + items]   (pending: confirm & check the ৳200 advance)
 *   to_pack:      [order + items]   (confirmed / processing)
 *   packing:      [{ product_id, brand, name, total_ml, remaining_ml, short, lines: [{ size, ml, qty }] }]
 *   low_stock:    [{ product_id, brand, name, remaining_ml, threshold_ml, bottle_size_ml, status: 'out'|'low' }]
 * }
 */

require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../inventory_helpers.php';

sendCorsAndHeaders();
requireAdminAuth();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') jsonError('Method not allowed', 405);

$db = Database::getConnection();
$isSqlite = $db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
$todayStart = $isSqlite ? "date('now','localtime')" : 'CURDATE()';

try {
    $open = $db->query("SELECT id, order_number, customer_name, customer_phone, shipping_address, city_zone, total_amount, delivery_fee,
                               payment_method, payment_status, order_status, created_at
                        FROM orders
                        WHERE order_status IN ('pending','confirmed','processing')
                        ORDER BY created_at ASC")->fetchAll(PDO::FETCH_ASSOC);

    $ids = array_column($open, 'id');
    $itemsBy = [];
    if ($ids) {
        $in = implode(',', array_fill(0, count($ids), '?'));
        $st = $db->prepare("SELECT order_id, product_id, product_name, brand_name, selected_size, quantity FROM order_items WHERE order_id IN ($in)");
        $st->execute($ids);
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $it) $itemsBy[$it['order_id']][] = $it;
    }

    $newOrders = [];
    $toPack = [];
    $packing = [];
    foreach ($open as $o) {
        $o['items'] = $itemsBy[$o['id']] ?? [];
        if ($o['order_status'] === 'pending') {
            $newOrders[] = $o;
        } else {
            $toPack[] = $o;
            foreach ($o['items'] as $it) {
                $pid = (string)$it['product_id'];
                $ml = parseDecantMl((string)$it['selected_size']);
                $qty = max(1, (int)$it['quantity']);
                if (!isset($packing[$pid])) {
                    $packing[$pid] = ['product_id' => $pid, 'brand' => $it['brand_name'], 'name' => $it['product_name'], 'total_ml' => 0, 'lines' => []];
                }
                $key = (string)$it['selected_size'];
                if (!isset($packing[$pid]['lines'][$key])) $packing[$pid]['lines'][$key] = ['size' => $key, 'ml' => $ml, 'qty' => 0];
                $packing[$pid]['lines'][$key]['qty'] += $qty;
                $packing[$pid]['total_ml'] += $ml * $qty;
            }
        }
    }

    // Bottles: ml left per product
    $inv = [];
    try {
        foreach ($db->query("SELECT product_id, remaining_ml, low_stock_threshold_ml, bottle_size_ml FROM perfume_inventory WHERE product_id IS NOT NULL")->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $inv[(string)$r['product_id']] = $r;
        }
    } catch (Throwable $e) { /* inventory table optional */ }

    foreach ($packing as &$p) {
        $p['lines'] = array_values($p['lines']);
        usort($p['lines'], fn($a, $b) => $a['ml'] <=> $b['ml']);
        $left = isset($inv[$p['product_id']]) ? (float)$inv[$p['product_id']]['remaining_ml'] : null;
        $p['remaining_ml'] = $left;
        $p['short'] = $left !== null && $left < 0;
    }
    unset($p);
    $packing = array_values($packing);
    usort($packing, fn($a, $b) => strcmp($a['brand'] . $a['name'], $b['brand'] . $b['name']));

    // Low stock: published perfumes at or under their low mark
    $low = [];
    $prods = $db->query("SELECT id, brand, name FROM products WHERE status = 'published'")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($prods as $pr) {
        $r = $inv[(string)$pr['id']] ?? null;
        if (!$r) continue;
        $left = (float)$r['remaining_ml'];
        $mark = (float)($r['low_stock_threshold_ml'] ?: 15);
        if ($left <= $mark) {
            $low[] = [
                'product_id' => (string)$pr['id'],
                'brand' => $pr['brand'],
                'name' => $pr['name'],
                'remaining_ml' => $left,
                'threshold_ml' => $mark,
                'bottle_size_ml' => (float)$r['bottle_size_ml'],
                'status' => $left <= 0 ? 'out' : 'low',
            ];
        }
    }
    usort($low, fn($a, $b) => $a['remaining_ml'] <=> $b['remaining_ml']);

    $shippedToday = 0;
    try {
        $shippedToday = (int)$db->query("SELECT COUNT(DISTINCT order_id) FROM order_status_history WHERE new_status = 'shipped' AND DATE(created_at) = $todayStart")->fetchColumn();
    } catch (Throwable $e) { /* history table optional */ }
    $unpaid = count(array_filter($newOrders, fn($o) => ($o['payment_status'] ?? 'unpaid') !== 'paid'));

    jsonResponse([
        'counts' => [
            'new' => count($newOrders),
            'to_pack' => count($toPack),
            'shipped_today' => $shippedToday,
            'unpaid_advance' => $unpaid,
            'low_stock' => count($low),
        ],
        'new_orders' => $newOrders,
        'to_pack' => $toPack,
        'packing' => $packing,
        'low_stock' => $low,
    ]);
} catch (Throwable $e) {
    jsonError('Could not load today: ' . $e->getMessage(), 500);
}

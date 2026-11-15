<?php
/**
 * Admin "Courier" page — every parcel handed to the courier (last 90 days).
 * GET -> { parcels: [{ id, order_number, customer_name, customer_phone, city_zone, total_amount,
 *          cod_amount, tracking_number, courier_status, order_status, created_at, age_min, ml_back }] }
 */

require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../order_payment_helpers.php';

sendCorsAndHeaders();
requireAdminAuth();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') jsonError('Method not allowed', 405);

try {
    $db = Database::getConnection();
    $isSqlite = $db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
    ensureAdvanceTypeColumn($db);
    $hasAdv = true;
    try { $db->query("SELECT advance_type FROM orders LIMIT 1"); } catch (Throwable $e) { $hasAdv = false; }
    $hasCs = ensureCourierStatusColumn($db);
    $since = $isSqlite ? "datetime('now','-90 days')" : 'DATE_SUB(NOW(), INTERVAL 90 DAY)';
    $age = $isSqlite ? "CAST((julianday('now') - julianday(created_at)) * 1440 AS INTEGER)" : 'TIMESTAMPDIFF(MINUTE, created_at, NOW())';

    $rows = $db->query("SELECT id, order_number, customer_name, customer_phone, city_zone, total_amount, delivery_fee,
            payment_method, payment_status, " . ($hasAdv ? 'advance_type' : 'NULL AS advance_type') . ",
            tracking_number, " . ($hasCs ? 'courier_status' : 'NULL AS courier_status') . ", order_status, created_at, $age AS age_min
        FROM orders
        WHERE created_at >= $since
          AND (order_status = 'shipped'
               OR (order_status IN ('delivered','cancelled') AND tracking_number IS NOT NULL AND tracking_number <> ''))
        ORDER BY id DESC LIMIT 300")->fetchAll(PDO::FETCH_ASSOC);

    $mlBack = $db->prepare("SELECT COUNT(*) FROM inventory_transactions WHERE order_id = ? AND transaction_type IN ('order_cancellation','order_refund')");
    foreach ($rows as &$r) {
        $r['id'] = (int)$r['id'];
        $r['cod_amount'] = orderCodAmount($r);
        $r['ml_back'] = false;
        if ($r['order_status'] === 'cancelled') {
            try { $mlBack->execute([$r['id']]); $r['ml_back'] = (int)$mlBack->fetchColumn() > 0; } catch (Throwable $e) {}
        }
        unset($r['delivery_fee'], $r['payment_method']);
    }
    unset($r);

    jsonResponse(['parcels' => $rows]);
} catch (Throwable $e) {
    jsonError('Could not load parcels: ' . $e->getMessage(), 500);
}

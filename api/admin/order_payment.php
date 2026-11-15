<?php
/**
 * Set how an order is being paid (admin).
 * POST { id, advance_type: "delivery" | "full" | "cod" }
 *   delivery → customer sent the delivery charge in advance; courier collects the rest
 *   full     → customer paid everything in advance; courier collects ৳0
 *   cod      → nothing in advance; courier collects the full amount
 */

require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../order_payment_helpers.php';

sendCorsAndHeaders();
$admin = requireAdminAuth();
$db = Database::getConnection();
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') jsonError('Method not allowed', 405);

ensureAdvanceTypeColumn($db);

$in = getJsonInput() ?: [];
$id = (int)($in['id'] ?? 0);
$type = (string)($in['advance_type'] ?? '');
if ($id <= 0 || !in_array($type, ['delivery', 'full', 'cod'], true)) jsonError('Choose delivery, full or cod.', 422);

$st = $db->prepare("SELECT id, order_status, payment_status FROM orders WHERE id = ? LIMIT 1");
$st->execute([$id]);
$o = $st->fetch(PDO::FETCH_ASSOC);
if (!$o) jsonError('Order not found', 404);

// delivery / full advance received → paid; cash on delivery → unpaid until the courier collects
$pay = $type === 'cod' ? 'unpaid' : 'paid';
$db->prepare("UPDATE orders SET advance_type = ?, payment_status = ? WHERE id = ?")->execute([$type, $pay, $id]);

$label = ['delivery' => 'Delivery charge paid in advance', 'full' => 'Full amount paid in advance', 'cod' => 'Cash on delivery'][$type];
try {
    $db->prepare("INSERT INTO order_status_history (order_id, old_status, new_status, note, changed_by) VALUES (?, ?, ?, ?, ?)")
       ->execute([$id, $o['order_status'], $o['order_status'], $label, 'admin:' . $admin['id']]);
} catch (Throwable $e) {}

jsonResponse(['id' => $id, 'advance_type' => $type, 'payment_status' => $pay]);

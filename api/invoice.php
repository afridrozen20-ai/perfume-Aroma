<?php
/**
 * Public invoice for one order (link sent to the customer on WhatsApp).
 * GET ?o=<order_number>&k=<token>
 * Only works with the signed token; shows no phone/address details beyond the customer's own.
 */
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/order_payment_helpers.php';

sendCorsAndHeaders();
$db = Database::getConnection();
$num = (string)($_GET['o'] ?? '');
$tok = (string)($_GET['k'] ?? '');
if ($num === '' || $tok === '' || !preg_match('/^[A-Za-z0-9\-_]{3,40}$/', $num)) jsonError('Invoice not found', 404);
if (!hash_equals(invoiceToken($db, $num), $tok)) jsonError('Invoice not found', 404);

ensureAdvanceTypeColumn($db);
$st = $db->prepare("SELECT * FROM orders WHERE order_number = ? LIMIT 1");
$st->execute([$num]);
$o = $st->fetch(PDO::FETCH_ASSOC);
if (!$o) jsonError('Invoice not found', 404);
$it = $db->prepare("SELECT product_name, brand_name, selected_size, quantity, unit_price, line_total FROM order_items WHERE order_id = ?");
$it->execute([$o['id']]);

$cod = orderCodAmount($o);
$total = (float)$o['total_amount'];
jsonResponse([
    'order_number' => $o['order_number'],
    'date' => $o['created_at'],
    'status' => $o['order_status'],
    'customer_name' => $o['customer_name'],
    'customer_phone' => $o['customer_phone'],
    'shipping_address' => $o['shipping_address'],
    'city_zone' => $o['city_zone'],
    'items' => $it->fetchAll(PDO::FETCH_ASSOC),
    'subtotal' => (float)$o['subtotal'],
    'discount' => (float)$o['discount'],
    'delivery_fee' => (float)$o['delivery_fee'],
    'total' => $total,
    'paid' => max(0, $total - $cod),
    'due' => $cod,
    'advance_type' => $o['advance_type'] ?? null,
    'tracking' => $o['tracking_number'] ?? null,
]);

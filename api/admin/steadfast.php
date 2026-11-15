<?php
/**
 * Steadfast courier — book parcels straight from the admin.
 *
 * GET                       -> { configured, api_key_hint, balance? , error? }
 * POST { action: "save_keys", api_key, secret_key }   -> saves keys (server only), tests them
 * POST { action: "remove_keys" }
 * POST { action: "send", order_ids?: [..] }           -> books confirmed + advance-paid orders
 *      (no order_ids = every eligible order). Each booked order gets its tracking code and becomes "shipped".
 *
 * Keys never leave the server: they are not returned by this endpoint or by /admin/settings.php.
 */

require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../order_payment_helpers.php';

sendCorsAndHeaders();
$admin = requireAdminAuth();
$db = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$isSqlite = $db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';

const SF_BASE = 'https://portal.packzy.com/api/v1';

function sfGetSetting(PDO $db, string $k): string {
    $s = $db->prepare("SELECT setting_value FROM store_settings WHERE setting_key = ? LIMIT 1");
    $s->execute([$k]);
    return (string)($s->fetchColumn() ?: '');
}
function sfSetSetting(PDO $db, bool $isSqlite, string $k, string $v): void {
    if ($isSqlite) {
        $db->prepare("INSERT INTO store_settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value")->execute([$k, $v]);
    } else {
        $db->prepare("INSERT INTO store_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)")->execute([$k, $v]);
    }
}
function sfCall(string $method, string $path, string $key, string $secret, ?array $body = null): array {
    if (!function_exists('curl_init')) return ['ok' => false, 'http' => 0, 'json' => null, 'error' => 'cURL is not available on this server'];
    $ch = curl_init(SF_BASE . $path);
    $headers = ['Api-Key: ' . $key, 'Secret-Key: ' . $secret, 'Content-Type: application/json', 'Accept: application/json'];
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_CUSTOMREQUEST => $method,
    ]);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_UNICODE));
    $raw = curl_exec($ch);
    $err = curl_error($ch);
    $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $json = is_string($raw) ? json_decode($raw, true) : null;
    return ['ok' => $raw !== false && $http >= 200 && $http < 300, 'http' => $http, 'json' => $json, 'error' => $err ?: ($json['message'] ?? null)];
}
function sfHint(string $k): string { return $k === '' ? '' : str_repeat('•', 6) . substr($k, -4); }

$key = sfGetSetting($db, 'steadfast_api_key');
$secret = sfGetSetting($db, 'steadfast_secret_key');

if ($method === 'GET') {
    $out = ['configured' => $key !== '' && $secret !== '', 'api_key_hint' => sfHint($key)];
    if ($out['configured'] && !empty($_GET['check'])) {
        $r = sfCall('GET', '/get_balance', $key, $secret);
        if ($r['ok'] && isset($r['json']['current_balance'])) $out['balance'] = (float)$r['json']['current_balance'];
        else $out['error'] = 'Steadfast did not accept these keys' . ($r['http'] ? " (HTTP {$r['http']})" : '') . '.';
    }
    jsonResponse($out);
}

if ($method !== 'POST') jsonError('Method not allowed', 405);
$in = getJsonInput() ?: [];
$action = (string)($in['action'] ?? '');

if ($action === 'save_keys') {
    $k = trim((string)($in['api_key'] ?? ''));
    $s = trim((string)($in['secret_key'] ?? ''));
    if ($k === '' || $s === '') jsonError('Enter both the API key and the secret key.', 422);
    if (strlen($k) > 200 || strlen($s) > 200) jsonError('These keys look too long.', 422);
    $test = sfCall('GET', '/get_balance', $k, $s);
    if (!($test['ok'] && isset($test['json']['current_balance']))) {
        jsonError('Steadfast did not accept these keys' . ($test['http'] ? " (HTTP {$test['http']})" : '') . '. Check them and try again.', 422);
    }
    sfSetSetting($db, $isSqlite, 'steadfast_api_key', $k);
    sfSetSetting($db, $isSqlite, 'steadfast_secret_key', $s);
    try {
        $db->prepare("INSERT INTO audit_logs (user_id, action, entity, details) VALUES (?, 'update_settings', 'steadfast', 'Saved Steadfast API keys')")->execute([$admin['id']]);
    } catch (Throwable $e) {}
    jsonResponse(['configured' => true, 'api_key_hint' => sfHint($k), 'balance' => (float)$test['json']['current_balance']]);
}

if ($action === 'remove_keys') {
    $db->prepare("DELETE FROM store_settings WHERE setting_key IN ('steadfast_api_key','steadfast_secret_key')")->execute();
    jsonResponse(['configured' => false]);
}

if ($action === 'send') {
    if ($key === '' || $secret === '') jsonError('Add your Steadfast keys in Store Settings first.', 422);

    // "confirm": the admin tapped "Confirm & send" on a new order, so pending orders are allowed too
    $allowPending = !empty($in['confirm']);
    ensureAdvanceTypeColumn($db);
    $hasAdv = true;
    try { $db->query("SELECT advance_type FROM orders LIMIT 1"); } catch (Throwable $e) { $hasAdv = false; }
    $where = "order_status IN (" . ($allowPending ? "'pending'," : '') . "'confirmed','processing') AND (payment_status = 'paid'" . ($hasAdv ? " OR advance_type = 'cod'" : '') . ")";
    $params = [];
    $ids = array_values(array_filter(array_map('intval', (array)($in['order_ids'] ?? []))));
    if ($ids) {
        $where .= ' AND id IN (' . implode(',', array_fill(0, count($ids), '?')) . ')';
        $params = $ids;
    }
    $st = $db->prepare("SELECT * FROM orders WHERE $where ORDER BY created_at ASC LIMIT 100");
    $st->execute($params);
    $orders = $st->fetchAll(PDO::FETCH_ASSOC);

    $itemsSt = $db->prepare("SELECT product_name, selected_size, quantity FROM order_items WHERE order_id = ?");
    $upd = $db->prepare("UPDATE orders SET order_status = 'shipped', tracking_number = ? WHERE id = ?");
    $hist = $db->prepare("INSERT INTO order_status_history (order_id, old_status, new_status, note, changed_by) VALUES (?, ?, 'shipped', ?, ?)");

    $results = [];
    foreach ($orders as $o) {
        $itemsSt->execute([$o['id']]);
        $items = $itemsSt->fetchAll(PDO::FETCH_ASSOC);
        $desc = implode(', ', array_map(fn($i) => $i['product_name'] . ' ' . $i['selected_size'] . ' x' . (int)$i['quantity'], $items));
        $cod = orderCodAmount($o);
        $phone = preg_replace('/\D+/', '', (string)$o['customer_phone']);
        if (strlen($phone) === 13 && substr($phone, 0, 3) === '880') $phone = substr($phone, 2);

        $payload = [
            'invoice' => (string)$o['order_number'],
            'recipient_name' => mb_substr((string)$o['customer_name'], 0, 100),
            'recipient_phone' => $phone,
            'recipient_address' => mb_substr((string)$o['shipping_address'], 0, 250),
            'cod_amount' => (int)round($cod),
            'item_description' => mb_substr($desc, 0, 250),
            'note' => 'Pure Portions by Arrina',
        ];
        $r = sfCall('POST', '/create_order', $key, $secret, $payload);
        $c = $r['json']['consignment'] ?? null;
        if ($r['ok'] && is_array($c) && !empty($c['tracking_code'])) {
            $upd->execute([(string)$c['tracking_code'], $o['id']]);
            try { $hist->execute([$o['id'], $o['order_status'], 'Booked on Steadfast · ' . $c['tracking_code'] . ' · CID ' . ($c['consignment_id'] ?? ''), 'admin:' . $admin['id']]); } catch (Throwable $e) {}
            $results[] = ['id' => (int)$o['id'], 'order_number' => $o['order_number'], 'ok' => true, 'tracking_code' => $c['tracking_code'], 'consignment_id' => $c['consignment_id'] ?? null, 'cod' => (int)round($cod)];
        } else {
            $msg = $r['json']['message'] ?? ($r['json']['errors'] ?? null);
            if (is_array($msg)) $msg = implode(' ', array_map(fn($v) => is_array($v) ? implode(' ', $v) : (string)$v, $msg));
            $results[] = ['id' => (int)$o['id'], 'order_number' => $o['order_number'], 'ok' => false, 'error' => $msg ?: ($r['error'] ?: 'Steadfast refused this parcel' . ($r['http'] ? " (HTTP {$r['http']})" : ''))];
        }
    }
    jsonResponse(['sent' => count(array_filter($results, fn($x) => $x['ok'])), 'failed' => count(array_filter($results, fn($x) => !$x['ok'])), 'results' => $results]);
}

if ($action === 'track') {
    if ($key === '' || $secret === '') jsonError('Add your Steadfast keys in Store Settings first.', 422);
    $hasCol = ensureCourierStatusColumn($db);
    $rows = $db->query("SELECT id, order_number, tracking_number, order_status FROM orders
                        WHERE order_status = 'shipped' AND tracking_number IS NOT NULL AND tracking_number <> ''
                        ORDER BY id DESC LIMIT 80")->fetchAll(PDO::FETCH_ASSOC);
    $setCs = $hasCol ? $db->prepare("UPDATE orders SET courier_status = ? WHERE id = ?") : null;
    $setSt = $db->prepare("UPDATE orders SET order_status = ? WHERE id = ?");
    $hist = $db->prepare("INSERT INTO order_status_history (order_id, old_status, new_status, note, changed_by) VALUES (?, 'shipped', ?, ?, 'steadfast')");
    $out = [];
    foreach ($rows as $r) {
        $res = sfCall('GET', '/status_by_invoice/' . rawurlencode($r['order_number']), $key, $secret);
        $ds = $res['json']['delivery_status'] ?? null;
        if (!$ds) {
            $res = sfCall('GET', '/status_by_trackingcode/' . rawurlencode($r['tracking_number']), $key, $secret);
            $ds = $res['json']['delivery_status'] ?? null;
        }
        if (!$ds) { $out[] = ['id' => (int)$r['id'], 'order_number' => $r['order_number'], 'status' => null]; continue; }
        if ($setCs) $setCs->execute([$ds, $r['id']]);
        $final = null;
        if ($ds === 'delivered' || $ds === 'partial_delivered') $final = 'delivered';
        elseif ($ds === 'cancelled') $final = 'cancelled';
        if ($final) {
            $setSt->execute([$final, $r['id']]);
            try { $hist->execute([$r['id'], $final, 'Steadfast: ' . $ds]); } catch (Throwable $e) {}
        }
        $out[] = ['id' => (int)$r['id'], 'order_number' => $r['order_number'], 'status' => $ds, 'final' => $final];
    }
    jsonResponse(['checked' => count($out), 'results' => $out]);
}

jsonError('Unknown action', 400);

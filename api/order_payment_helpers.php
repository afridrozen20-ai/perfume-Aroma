<?php
/** Shared rules for advance payments and the cash the courier collects. */

function ensureAdvanceTypeColumn(PDO $db): void {
    static $done = false;
    if ($done) return;
    $done = true;
    try { $db->query("SELECT advance_type FROM orders LIMIT 1"); return; } catch (Throwable $e) {}
    try { $db->exec("ALTER TABLE orders ADD COLUMN advance_type VARCHAR(16) NULL"); } catch (Throwable $e) {}
}

/** Can this order go to the courier? Cash on delivery, or an advance has been received. */
function orderReadyForCourier(array $o): bool {
    $t = $o['advance_type'] ?? null;
    if ($t === 'cod') return true;
    return ($o['payment_status'] ?? '') === 'paid';
}

/** Cash the courier should collect from the customer. */
function orderCodAmount(array $o): float {
    $total = (float)($o['total_amount'] ?? 0);
    $fee = (float)($o['delivery_fee'] ?? 0);
    switch ($o['advance_type'] ?? null) {
        case 'full': return 0;
        case 'delivery': return max(0, $total - $fee);
        case 'cod': return $total;
    }
    // Older orders without a type: offline + paid = nothing; website + paid = ৳200 advance; unpaid = everything
    if (($o['payment_status'] ?? '') !== 'paid') return $total;
    return ($o['payment_method'] ?? '') === 'offline' ? 0 : max(0, $total - 200);
}

/** Secret for invoice links (created once, kept in store_settings). */
function invoiceSecret(PDO $db): string {
    $s = $db->prepare("SELECT setting_value FROM store_settings WHERE setting_key = 'invoice_link_secret' LIMIT 1");
    $s->execute();
    $v = (string)($s->fetchColumn() ?: '');
    if ($v !== '') return $v;
    $v = bin2hex(random_bytes(24));
    $isSqlite = $db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
    try {
        if ($isSqlite) $db->prepare("INSERT OR IGNORE INTO store_settings (setting_key, setting_value) VALUES ('invoice_link_secret', ?)")->execute([$v]);
        else $db->prepare("INSERT IGNORE INTO store_settings (setting_key, setting_value) VALUES ('invoice_link_secret', ?)")->execute([$v]);
    } catch (Throwable $e) {}
    $s->execute();
    return (string)($s->fetchColumn() ?: $v);
}

/** Short signature so only the customer with the link can open their invoice. */
function invoiceToken(PDO $db, string $orderNumber): string {
    return substr(hash_hmac('sha256', $orderNumber, invoiceSecret($db)), 0, 16);
}

function ensureCourierStatusColumn(PDO $db): bool {
    try { $db->query("SELECT courier_status FROM orders LIMIT 1"); return true; } catch (Throwable $e) {}
    try { $db->exec("ALTER TABLE orders ADD COLUMN courier_status VARCHAR(40) NULL"); return true; } catch (Throwable $e) { return false; }
}

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

<?php
/**
 * Public Products REST Endpoint
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/inventory_helpers.php';

/** ml left in each product's bottle (null when not tracked). */
function ppMlLeft(PDO $db, array $ids): array {
    if (empty($ids)) return [];
    $in = implode(',', array_fill(0, count($ids), '?'));
    $st = $db->prepare("SELECT product_id, remaining_ml FROM perfume_inventory WHERE product_id IN ($in)");
    $st->execute(array_values($ids));
    $m = [];
    foreach ($st->fetchAll() as $r) $m[$r['product_id']] = (float)$r['remaining_ml'];
    return $m;
}

/** Marks sizes the bottle can no longer fill. */
function ppApplySoldOut(array $sizes, ?float $left): array {
    foreach ($sizes as &$sz) {
        $sz['soldOut'] = $left !== null && parseDecantMl((string)$sz['size']) > $left;
    }
    return $sizes;
}

sendCorsAndHeaders();

$db = Database::getConnection();
try { repairEncodedText($db); } catch (Throwable $e) {}
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method !== 'GET') {
    jsonError('Method not allowed', 405);
}

$id = sanitizeString($_GET['id'] ?? null);
$slug = sanitizeString($_GET['slug'] ?? null);
$category = sanitizeString($_GET['category'] ?? null);
$brand = sanitizeString($_GET['brand'] ?? null);
$gender = sanitizeString($_GET['gender'] ?? null);
$search = sanitizeString($_GET['search'] ?? null);
$featured = isset($_GET['featured']) ? (int)$_GET['featured'] : null;

// Fetch Single Product
if ($id || $slug) {
    if ($id) {
        $stmt = $db->prepare("SELECT * FROM products WHERE id = ? AND status = 'published' LIMIT 1");
        $stmt->execute([$id]);
    } else {
        $stmt = $db->prepare("SELECT * FROM products WHERE slug = ? AND status = 'published' LIMIT 1");
        $stmt->execute([$slug]);
    }

    $product = $stmt->fetch();
    if (!$product) {
        jsonError('Product not found', 404);
    }

    // Fetch variants
    $varStmt = $db->prepare("SELECT id, size, price, cost_price, sku, stock_qty, image, is_available FROM product_variants WHERE product_id = ? AND is_available = 1 ORDER BY price ASC");
    $varStmt->execute([$product['id']]);
    $variants = $varStmt->fetchAll();

    $sizes = array_map(function($v) {
        return [
            'id' => $v['id'],
            'size' => $v['size'],
            'price' => (float)$v['price'],
            'stock_qty' => (int)$v['stock_qty'],
            'image' => $v['image'] ?? null
        ];
    }, $variants);

    // Fetch images
    $imgStmt = $db->prepare("SELECT image_path, alt_text, is_primary FROM product_images WHERE product_id = ? ORDER BY display_order ASC");
    $imgStmt->execute([$product['id']]);
    $images = $imgStmt->fetchAll();
    $additionalImages = array_column($images, 'image_path');
    $allImages = array_values(array_unique(array_filter(array_merge([$product['image']], $additionalImages))));

    $notes = json_decode($product['notes'] ?? '[]', true) ?: [];
    $topNotes = json_decode($product['top_notes'] ?? '[]', true) ?: [];
    $heartNotes = json_decode($product['heart_notes'] ?? '[]', true) ?: [];
    $baseNotes = json_decode($product['base_notes'] ?? '[]', true) ?: [];
    $attributes = json_decode($product['attributes_json'] ?? '[]', true) ?: [];
    $scentProfile = json_decode($product['scent_profile_json'] ?? '{}', true) ?: new \stdClass();

    $formattedProduct = [
        'id' => $product['id'],
        'brand' => $product['brand'],
        'name' => $product['name'],
        'slug' => $product['slug'],
        'category' => $product['category'],
        'gender' => $product['gender'],
        'concentration' => $product['concentration'],
        'startingPrice' => (float)$product['starting_price'],
        'image' => $product['image'],
        'images' => $allImages,
        'additionalImages' => $additionalImages,
        'notes' => $notes,
        'topNotes' => $topNotes,
        'heartNotes' => $heartNotes,
        'baseNotes' => $baseNotes,
        'attributes' => $attributes,
        'scentProfile' => $scentProfile,
        'scent_profile' => $scentProfile,
        'sizes' => ppApplySoldOut($sizes, ppMlLeft($db, [$product['id']])[$product['id']] ?? null),
        'shortDescription' => $product['short_description'],
        'description' => $product['description'],
        'inventoryQty' => (int)$product['inventory_qty']
    ];

    jsonResponse($formattedProduct, 200);
}

// Fetch List of Products
$where = ["status = 'published'"];
$params = [];

$collection = sanitizeString($_GET['collection'] ?? $_GET['collection_slug'] ?? null);
$family = sanitizeString($_GET['family'] ?? null);
$season = sanitizeString($_GET['season'] ?? null);
$occasion = sanitizeString($_GET['occasion'] ?? null);
$size = sanitizeString($_GET['size'] ?? null);
$concentration = sanitizeString($_GET['concentration'] ?? null);
$minPrice = isset($_GET['min_price']) && $_GET['min_price'] !== '' ? (float)$_GET['min_price'] : null;
$maxPrice = isset($_GET['max_price']) && $_GET['max_price'] !== '' ? (float)$_GET['max_price'] : null;
$newArrival = isset($_GET['new_arrival']) ? (int)$_GET['new_arrival'] : null;
$sort = sanitizeString($_GET['sort'] ?? 'featured');

// Collection Rule Handling
if ($collection && $collection !== 'all') {
    $cleanCol = strtolower(trim($collection));
    if (in_array($cleanCol, ['forhim', 'for-him', 'him', 'men'])) {
        $where[] = "gender = 'Him'";
    } elseif (in_array($cleanCol, ['forher', 'for-her', 'her', 'women'])) {
        $where[] = "gender = 'Her'";
    } elseif (in_array($cleanCol, ['unisex', 'shared'])) {
        $where[] = "gender = 'Unisex'";
    } elseif (in_array($cleanCol, ['best-sellers', 'bestsellers', 'best-seller', 'popular'])) {
        $where[] = "is_featured = 1";
    } elseif (in_array($cleanCol, ['new-arrivals', 'newarrivals', 'new-arrival', 'new'])) {
        $where[] = "is_new_arrival = 1";
    } else {
        // Query database collections table rule
        $colStmt = $db->prepare("SELECT * FROM collections WHERE (slug = ? OR LOWER(title) = ?) AND is_enabled = 1 LIMIT 1");
        $colStmt->execute([$cleanCol, str_replace('-', ' ', $cleanCol)]);
        $colRow = $colStmt->fetch();

        if ($colRow) {
            if ($colRow['rule_type'] === 'brand' && !empty($colRow['rule_value'])) {
                $where[] = "LOWER(brand) = ?";
                $params[] = strtolower($colRow['rule_value']);
            } elseif ($colRow['rule_type'] === 'gender' && !empty($colRow['rule_value'])) {
                $where[] = "gender = ?";
                $params[] = $colRow['rule_value'];
            } elseif ($colRow['rule_type'] === 'category' && !empty($colRow['rule_value'])) {
                $where[] = "(LOWER(category) LIKE ? OR LOWER(scent_profile_json) LIKE ?)";
                $params[] = '%' . strtolower($colRow['rule_value']) . '%';
                $params[] = '%' . strtolower($colRow['rule_value']) . '%';
            } elseif ($colRow['rule_type'] === 'featured') {
                $where[] = "is_featured = 1";
            } elseif ($colRow['rule_type'] === 'new_arrival') {
                $where[] = "is_new_arrival = 1";
            } elseif ($colRow['rule_type'] === 'manual') {
                $mapStmt = $db->prepare("SELECT product_id FROM collection_products WHERE collection_id = ?");
                $mapStmt->execute([$colRow['id']]);
                $mappedIds = array_column($mapStmt->fetchAll(), 'product_id');
                if (!empty($mappedIds)) {
                    $inM = implode(',', array_fill(0, count($mappedIds), '?'));
                    $where[] = "id IN ($inM)";
                    foreach ($mappedIds as $mId) $params[] = $mId;
                } else {
                    $where[] = "1 = 0";
                }
            }
        } else {
            // Check if cleanCol is a brand slug or name
            $brandCheckStmt = $db->query("SELECT brand FROM products WHERE brand IS NOT NULL AND brand != '' GROUP BY brand");
            $allBrandRows = $brandCheckStmt->fetchAll();
            $matchedBrand = null;

            foreach ($allBrandRows as $bRow) {
                $bSlug = strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', '-', $bRow['brand']), '-'));
                if ($bSlug === $cleanCol || strtolower($bRow['brand']) === str_replace('-', ' ', $cleanCol)) {
                    $matchedBrand = $bRow['brand'];
                    break;
                }
            }

            if ($matchedBrand) {
                $where[] = "LOWER(brand) = ?";
                $params[] = strtolower($matchedBrand);
            } else {
                // General category fallback
                $where[] = "(LOWER(category) LIKE ? OR LOWER(scent_profile_json) LIKE ?)";
                $params[] = '%' . str_replace('-', ' ', $cleanCol) . '%';
                $params[] = '%' . str_replace('-', ' ', $cleanCol) . '%';
            }
        }
    }
}

if ($category) {
    $where[] = "(LOWER(category) LIKE ? OR LOWER(scent_profile_json) LIKE ?)";
    $params[] = '%' . strtolower($category) . '%';
    $params[] = '%' . strtolower($category) . '%';
}

// Family is checked after fetching, against each perfume's own family list (see ppListHas)
if ($brand) {
    $brands = explode(',', $brand);
    $brandClauses = [];
    foreach ($brands as $b) {
        if (!empty(trim($b))) {
            $brandClauses[] = "LOWER(brand) = ?";
            $params[] = strtolower(trim($b));
        }
    }
    if (!empty($brandClauses)) {
        $where[] = '(' . implode(' OR ', $brandClauses) . ')';
    }
}

if ($gender) {
    // Exact match on the product's Him / Her / Unisex; only when that is blank, use the scent
    // profile's positioning. (A plain text search for "her" also hit "leather", "other" ...)
    $map = [
        'him' => ['him', 'masculine'],
        'her' => ['her', 'feminine'],
        'unisex' => ['unisex', 'unisex'],
    ];
    $genderClauses = [];
    foreach (explode(',', $gender) as $g) {
        $g = strtolower(trim($g));
        if (!isset($map[$g])) continue;
        [$col, $pos] = $map[$g];
        $genderClauses[] = "(LOWER(gender) = ? OR ((gender IS NULL OR gender = '') AND LOWER(scent_profile_json) LIKE ?))";
        $params[] = $col;
        $params[] = '%"genderpositioning":"' . $pos . '%';
    }
    if (!empty($genderClauses)) {
        $where[] = '(' . implode(' OR ', $genderClauses) . ')';
    }
}

if ($season) {
    $seasons = explode(',', $season);
    $seasonClauses = [];
    foreach ($seasons as $s) {
        if (!empty(trim($s))) {
            $seasonClauses[] = "LOWER(scent_profile_json) LIKE ?";
            $params[] = '%' . strtolower(trim($s)) . '%';
        }
    }
    if (!empty($seasonClauses)) {
        $where[] = '(' . implode(' OR ', $seasonClauses) . ')';
    }
}

// Occasion is checked after fetching, against each perfume's own occasion list (see ppListHas)
if ($concentration) {
    // EDT / EDP / Parfum / Extrait as separate kinds ("Parfum" must not pick up "Eau de Parfum")
    $concClauses = [];
    foreach (explode(',', $concentration) as $c) {
        $c = strtolower(trim($c));
        if ($c === '') continue;
        if ($c === 'edt') {
            $concClauses[] = "(LOWER(concentration) IN ('edt','eau de toilette') OR LOWER(concentration) LIKE '%toilette%')";
        } elseif ($c === 'edp') {
            $concClauses[] = "(LOWER(concentration) IN ('edp','eau de parfum') OR LOWER(concentration) LIKE 'eau de parfum%')";
        } elseif ($c === 'parfum') {
            $concClauses[] = "(LOWER(concentration) IN ('parfum','pure parfum','le parfum','elixir') OR (LOWER(concentration) LIKE '%parfum%' AND LOWER(concentration) NOT LIKE '%eau de%' AND LOWER(concentration) NOT LIKE '%extrait%'))";
        } elseif ($c === 'extrait') {
            $concClauses[] = "(LOWER(concentration) LIKE '%extrait%')";
        } else {
            $concClauses[] = "(LOWER(concentration) = ?)";
            $params[] = $c;
        }
    }
    if (!empty($concClauses)) {
        $where[] = '(' . implode(' OR ', $concClauses) . ')';
    }
}

if ($minPrice !== null) {
    $where[] = "starting_price >= ?";
    $params[] = $minPrice;
}

if ($maxPrice !== null) {
    $where[] = "starting_price <= ?";
    $params[] = $maxPrice;
}

if ($featured !== null) {
    $where[] = "is_featured = ?";
    $params[] = $featured;
}

if ($newArrival !== null) {
    $where[] = "is_new_arrival = ?";
    $params[] = $newArrival;
}

if ($search) {
    $where[] = "(LOWER(name) LIKE ? OR LOWER(brand) LIKE ? OR LOWER(category) LIKE ? OR LOWER(notes) LIKE ? OR LOWER(scent_profile_json) LIKE ?)";
    $term = '%' . strtolower($search) . '%';
    $params[] = $term;
    $params[] = $term;
    $params[] = $term;
    $params[] = $term;
    $params[] = $term;
}

// Sorting logic
$orderBy = "is_featured DESC, created_at DESC";
switch (strtolower($sort)) {
    case 'price-asc':
    case 'price_low_high':
    case 'price_asc':
        $orderBy = "starting_price ASC, name ASC";
        break;
    case 'price-desc':
    case 'price_high_low':
    case 'price_desc':
        $orderBy = "starting_price DESC, name ASC";
        break;
    case 'newest':
    case 'new':
        $orderBy = "created_at DESC";
        break;
    case 'name-asc':
    case 'a_z':
    case 'title':
        $orderBy = "name ASC";
        break;
    case 'best-selling':
    case 'bestselling':
        $orderBy = "is_featured DESC, starting_price DESC";
        break;
    case 'featured':
    default:
        $orderBy = "is_featured DESC, created_at DESC";
        break;
}

$whereClause = implode(' AND ', $where);
$sql = "SELECT * FROM products WHERE $whereClause ORDER BY $orderBy";

$stmt = $db->prepare($sql);
$stmt->execute($params);
$products = $stmt->fetchAll();

/** True when one of the wanted values is in the perfume's list (case and spacing around "/" ignored). */
function ppListHas($list, array $wanted): bool {
    if (!is_array($list)) return false;
    $norm = fn($v) => preg_replace('/\s*\/\s*/', ' / ', strtolower(trim((string)$v)));
    $have = array_map($norm, $list);
    foreach ($wanted as $w) { if (in_array($norm($w), $have, true)) return true; }
    return false;
}
$wantFamilies = $family ? array_values(array_filter(array_map('trim', explode(',', $family)))) : [];
$wantOccasions = $occasion ? array_values(array_filter(array_map('trim', explode(',', $occasion)))) : [];
if ($wantFamilies || $wantOccasions) {
    $products = array_values(array_filter($products, function ($row) use ($wantFamilies, $wantOccasions) {
        $sp = json_decode($row['scent_profile_json'] ?? '', true) ?: [];
        if ($wantFamilies && !ppListHas($sp['fragranceFamilies'] ?? [], $wantFamilies)) return false;
        if ($wantOccasions && !ppListHas($sp['occasions'] ?? [], $wantOccasions)) return false;
        return true;
    }));
}

// Fetch variants and images for all returned products
$productIds = array_column($products, 'id');
$variantsByProduct = [];
$imagesByProduct = [];

if (!empty($productIds)) {
    $inClause = implode(',', array_fill(0, count($productIds), '?'));
    $varStmt = $db->prepare("SELECT id, product_id, size, price, stock_qty, image FROM product_variants WHERE product_id IN ($inClause) AND is_available = 1 ORDER BY price ASC");
    $varStmt->execute($productIds);
    $allVariants = $varStmt->fetchAll();

    foreach ($allVariants as $v) {
        $variantsByProduct[$v['product_id']][] = [
            'id' => $v['id'],
            'size' => $v['size'],
            'price' => (float)$v['price'],
            'stock_qty' => (int)$v['stock_qty'],
            'image' => $v['image'] ?? null
        ];
    }

    $imgStmt = $db->prepare("SELECT product_id, image_path FROM product_images WHERE product_id IN ($inClause) ORDER BY display_order ASC");
    $imgStmt->execute($productIds);
    $allImages = $imgStmt->fetchAll();

    foreach ($allImages as $img) {
        $imagesByProduct[$img['product_id']][] = $img['image_path'];
    }
}

$mlLeftMap = ppMlLeft($db, array_column($products ?? [], 'id'));
$formattedList = array_map(function($p) use ($variantsByProduct, $imagesByProduct, $mlLeftMap) {
    $notes = json_decode($p['notes'] ?? '[]', true) ?: [];
    $topNotes = json_decode($p['top_notes'] ?? '[]', true) ?: [];
    $heartNotes = json_decode($p['heart_notes'] ?? '[]', true) ?: [];
    $baseNotes = json_decode($p['base_notes'] ?? '[]', true) ?: [];
    $attributes = json_decode($p['attributes_json'] ?? '[]', true) ?: [];
    $scentProfile = json_decode($p['scent_profile_json'] ?? '{}', true) ?: new \stdClass();

    $sizes = $variantsByProduct[$p['id']] ?? [];
    if (empty($sizes)) {
        $sizes = [['size' => '5ml', 'price' => (float)$p['starting_price'], 'stock_qty' => (int)$p['inventory_qty']]];
    }

    $sizes = ppApplySoldOut($sizes, $mlLeftMap[$p['id']] ?? null);

    $additionalImages = $imagesByProduct[$p['id']] ?? [];
    $allImages = array_values(array_unique(array_filter(array_merge([$p['image']], $additionalImages))));

    return [
        'id' => $p['id'],
        'brand' => $p['brand'],
        'name' => $p['name'],
        'slug' => $p['slug'],
        'category' => $p['category'],
        'gender' => $p['gender'],
        'concentration' => $p['concentration'],
        'startingPrice' => (float)$p['starting_price'],
        'image' => $p['image'],
        'images' => $allImages,
        'additionalImages' => $additionalImages,
        'notes' => $notes,
        'topNotes' => $topNotes,
        'heartNotes' => $heartNotes,
        'baseNotes' => $baseNotes,
        'attributes' => $attributes,
        'scentProfile' => $scentProfile,
        'scent_profile' => $scentProfile,
        'sizes' => $sizes,
        'shortDescription' => $p['short_description'],
        'description' => $p['description'] ?? '',
        'createdAt' => $p['created_at'] ?? null,
        'isNewArrival' => !empty($p['is_new_arrival'])
    ];
}, $products);

jsonResponse($formattedList, 200);

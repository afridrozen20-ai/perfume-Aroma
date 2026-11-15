import type { TodayData } from './TodayBoard';

const now = Date.now();
const t = (minAgo: number) => new Date(now - minAgo * 60000).toISOString().replace('T', ' ').slice(0, 19);

/** Sample data for the Today board preview (#today-demo). Not real orders. */
export const TODAY_DEMO: TodayData = {
  counts: { new: 2, to_pack: 3, shipped_today: 1, unpaid_advance: 1, low_stock: 3 },
  new_orders: [
    { id: 901, order_number: 'PP-4821', customer_name: 'Sadia Rahman', customer_phone: '01711-000000', shipping_address: 'Mirpur 10, Dhaka', city_zone: 'inside_dhaka', total_amount: 1190, delivery_fee: 100, advance_type: null, payment_status: 'unpaid', payment_method: 'cod', order_status: 'pending', created_at: t(25), age_min: 25,
      items: [{ product_id: 'a', product_name: 'Khamrah', brand_name: 'Lattafa', selected_size: '5ml', quantity: 1 }, { product_id: 'b', product_name: 'Yara', brand_name: 'Lattafa', selected_size: '3ml', quantity: 1 }] },
    { id: 902, order_number: 'PP-4822', customer_name: 'Tanvir Hasan', customer_phone: '01822-000000', shipping_address: 'Sadar, Narsingdi', city_zone: 'narsingdi', total_amount: 670, delivery_fee: 80, advance_type: 'delivery', payment_status: 'paid', payment_method: 'cod', order_status: 'pending', created_at: t(70), age_min: 70,
      items: [{ product_id: 'c', product_name: 'Hawas Fire', brand_name: 'Rasasi', selected_size: '10ml', quantity: 1 }] },
  ],
  to_pack: [
    { id: 880, order_number: 'PP-4810', customer_name: 'Nusrat Jahan', customer_phone: '01933-000000', shipping_address: 'Agrabad, Chattogram', city_zone: 'outside_dhaka', total_amount: 1530, delivery_fee: 130, advance_type: 'delivery', payment_status: 'paid', payment_method: 'cod', order_status: 'confirmed', created_at: t(600),
      items: [{ product_id: 'a', product_name: 'Khamrah', brand_name: 'Lattafa', selected_size: '10ml', quantity: 1 }, { product_id: 'd', product_name: 'Aventus', brand_name: 'Creed', selected_size: '1.5ml', quantity: 1 }] },
    { id: 881, order_number: 'PP-4812', customer_name: 'Rafi Ahmed', customer_phone: '01644-000000', shipping_address: 'Dhanmondi 27, Dhaka', city_zone: 'inside_dhaka', total_amount: 850, delivery_fee: 100, advance_type: 'cod', payment_status: 'unpaid', payment_method: 'cod', order_status: 'confirmed', created_at: t(480),
      items: [{ product_id: 'a', product_name: 'Khamrah', brand_name: 'Lattafa', selected_size: '3ml', quantity: 2 }, { product_id: 'c', product_name: 'Hawas Fire', brand_name: 'Rasasi', selected_size: '5ml', quantity: 1 }] },
    { id: 882, order_number: 'PP-4815', customer_name: 'Mim Akter', customer_phone: '01555-000000', shipping_address: 'Messenger order', city_zone: 'inside_dhaka', total_amount: 590, delivery_fee: 100, advance_type: 'full', payment_status: 'paid', payment_method: 'offline', order_status: 'processing', created_at: t(300),
      items: [{ product_id: 'd', product_name: 'Aventus', brand_name: 'Creed', selected_size: '1.5ml', quantity: 1 }] },
  ],
  packing: [
    { product_id: 'd', brand: 'Creed', name: 'Aventus', total_ml: 3, remaining_ml: 6, short: false, lines: [{ size: '1.5ml', ml: 1.5, qty: 2 }] },
    { product_id: 'a', brand: 'Lattafa', name: 'Khamrah', total_ml: 16, remaining_ml: 42, short: false, lines: [{ size: '3ml', ml: 3, qty: 2 }, { size: '10ml', ml: 10, qty: 1 }] },
    { product_id: 'c', brand: 'Rasasi', name: 'Hawas Fire', total_ml: 5, remaining_ml: -1, short: true, lines: [{ size: '5ml', ml: 5, qty: 1 }] },
  ],
  low_stock: [
    { product_id: 'e', brand: 'Kayali', name: 'Vanilla 28', remaining_ml: 0, threshold_ml: 15, bottle_size_ml: 100, status: 'out' },
    { product_id: 'c', brand: 'Rasasi', name: 'Hawas Fire', remaining_ml: 4, threshold_ml: 15, bottle_size_ml: 100, status: 'low' },
    { product_id: 'd', brand: 'Creed', name: 'Aventus', remaining_ml: 6, threshold_ml: 15, bottle_size_ml: 100, status: 'low' },
  ],
};

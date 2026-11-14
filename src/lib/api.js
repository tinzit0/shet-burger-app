import { supabase } from './supabase';
import { getOrderStage } from '../shared/orderStatus.js';
import { DELIVERY_ZONES } from '../shared/delivery.js';
import { isValidPolygon } from '../shared/geo.js';
import { normalizeCouponCode } from '../shared/couponRules.js';

// Mismo formato que shet-burger/src/lib/orders.js → normalizeOrder.
export const normalizeOrder = order => ({
  ...order,
  id: order.id || order.order_number,
  mode: order.fulfillment || order.mode,
  stage: getOrderStage(order),
  customer: order.customer || { name: order.customer_name || '', phone: order.customer_phone || '', address: order.address || '' },
});

export async function loadCatalog() {
  const { data, error } = await supabase.from('shet_catalog_products').select('payload,position').eq('active', true).order('position');
  if (error) throw error;
  return data.map(row => row.payload);
}

export async function loadStore() {
  const [settings, availability] = await Promise.all([
    supabase.from('store_settings').select('is_open').eq('id', 1).single(),
    supabase.from('product_availability').select('product_id,available'),
  ]);
  const stock = {};
  for (const row of availability.data || []) stock[row.product_id] = row.available;
  return { storeOpen: settings.data?.is_open ?? true, stock };
}

export async function loadZones({ includeInactive = false } = {}) {
  const { data, error } = await supabase.from('delivery_zones').select('id,label,fee,color,polygon,active,position').order('position', { ascending: true });
  if (error || !data?.length) return DELIVERY_ZONES;
  const zones = data.map(row => ({
    id: String(row.id), label: String(row.label || '').trim(), fee: Math.max(0, Math.round(Number(row.fee) || 0)),
    color: row.color || '#EC3478', polygon: (row.polygon || []).map(([lat, lng]) => [Number(lat), Number(lng)]), active: row.active !== false,
  })).filter(zone => zone.label && isValidPolygon(zone.polygon));
  return includeInactive ? zones : zones.filter(zone => zone.active);
}

export const loadPublicCoupons = () => supabase.from('coupons').select('*').eq('active', true).eq('published', true).order('created_at', { ascending: false });
export const findCoupon = code => supabase.from('coupons').select('*').eq('code', normalizeCouponCode(code)).maybeSingle();

export async function loadPublicOrder(orderNumber) {
  const { data, error } = await supabase.from('orders').select('*').eq('order_number', orderNumber).maybeSingle();
  if (error) throw error;
  return data ? normalizeOrder(data) : null;
}

// Sube el comprobante (si hay) y crea el pedido con la misma función que usa la web.
// El servidor revalida precios, stock, zona y cupón: la app no puede inventar montos.
export async function placeOrder(order, receipt) {
  let receiptPath = null;
  if (receipt) {
    receiptPath = `guest/${order.order_number}/${Date.now()}-${(receipt.name || 'comprobante.jpg').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const body = await (await fetch(receipt.uri)).arrayBuffer();
    const upload = await supabase.storage.from('order-receipts').upload(receiptPath, body, { contentType: receipt.mimeType || 'image/jpeg', upsert: false });
    if (upload.error) throw upload.error;
  }
  const { data, error } = await supabase.rpc(order.coupon_code ? 'shet_place_order_with_coupon' : 'shet_place_order', {
    ...(order.coupon_code ? { p_coupon_code: order.coupon_code } : {}),
    p_order_number: order.order_number,
    p_customer_name: order.customer_name,
    p_customer_phone: order.customer_phone,
    p_fulfillment: order.fulfillment,
    p_address: order.address || '',
    p_items: order.items,
    p_receipt_name: order.receipt_name || '',
    p_receipt_path: receiptPath,
  }).single();
  if (error) throw error;
  return normalizeOrder(data);
}

// Avisa cada cambio en una tabla. Devuelve la función para dejar de escuchar.
export function subscribe(table, onChange) {
  const channel = supabase.channel(`app-${table}-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, onChange)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// ---- Dueño: mismo acceso con correo y contraseña que el panel web (/admin). ----
export async function adminLogin(email, password) {
  const { data, error } = await supabase.rpc('demo_admin_login', { p_email: email.trim(), p_password: password });
  if (error) throw new Error(error.message.includes('inválid') || error.message.includes('invalid') ? 'Correo o contraseña incorrectos.' : error.message);
  const token = typeof data === 'string' ? data : data?.token || data?.[0]?.token;
  if (!token) throw new Error('Correo o contraseña incorrectos.');
  return token;
}

export async function adminOrders() {
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(300);
  if (error) throw error;
  return data.map(normalizeOrder);
}

export const adminSetStatus = (order, status, stage) => supabase.from('orders')
  .update({ status, stage }).eq(/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(String(order.id)) ? 'id' : 'order_number', order.id);
export const adminSetStoreOpen = (token, isOpen) => supabase.rpc('demo_update_store_open', { p_token: token, p_is_open: isOpen });
export const adminSetAvailability = (token, productId, available) => supabase.rpc('demo_update_product_availability', { p_token: token, p_product_id: productId, p_available: available });
export const adminCoupons = token => supabase.rpc('admin_list_coupons', { p_token: token });
export const adminSaveCoupon = (token, coupon) => supabase.rpc('admin_save_coupon', { p_coupon: coupon, p_token: token });
export const adminReceiptUrl = async path => (await supabase.storage.from('order-receipts').createSignedUrl(path, 600)).data?.signedUrl || null;

// Igual que deleteStoredOrder de la web: borra el comprobante (si se puede) y luego el pedido.
export async function adminDeleteOrder(order) {
  const key = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(String(order.id)) ? 'id' : 'order_number';
  if (order.receipt_path) await supabase.storage.from('order-receipts').remove([order.receipt_path]).catch(() => {});
  return supabase.from('orders').delete().eq(key, order.id);
}
export const adminDeleteCoupon = (token, id) => supabase.rpc('admin_delete_coupon', { p_id: id, p_token: token });
export const adminSaveZones = (token, zones) => supabase.rpc('admin_save_delivery_zones', {
  p_zones: zones.map((zone, position) => ({ id: zone.id, label: zone.label.trim(), fee: Math.max(0, Math.round(Number(zone.fee) || 0)), color: zone.color, polygon: zone.polygon, active: zone.active !== false, position })),
  p_token: token,
});

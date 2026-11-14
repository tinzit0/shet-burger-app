import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Chip, ProductPhoto } from './ui';
import DeliveryMap from './DeliveryMap';
import { adminCoupons, adminDeleteCoupon, adminReceiptUrl, adminSaveCoupon, adminSaveZones, adminSetAvailability, loadZones } from '../lib/api';
import { colors, fonts, money } from '../lib/theme';
import { ORDER_STAGES, getOrderStage } from '../shared/orderStatus.js';
import { couponPerformance, customerInsights, daySummary, hourlyOrders, kitchenQueue, productRanking, whatsappLink } from '../shared/insights.js';
import { couponConditions, couponLabel, promotionTypes } from '../shared/couponRules.js';

// Secciones del panel, con el mismo contenido y textos que el panel web (/admin).
export const P = {
  title: { fontFamily: fonts.button, fontSize: 26, letterSpacing: -0.5, textTransform: 'uppercase', color: colors.ink },
  box: { backgroundColor: colors.white, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, padding: 16 },
  small: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  pill: { minHeight: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  pillText: { fontFamily: fonts.button, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.ink },
};
export const Pill = ({ title, onPress, active, tone, disabled, icon }) => <Pressable disabled={disabled} onPress={() => { Haptics.selectionAsync().catch(() => {}); onPress?.(); }}
  style={({ pressed }) => [P.pill, active && { backgroundColor: colors.ink, borderColor: colors.ink }, tone === 'good' && { backgroundColor: colors.goodBg }, tone === 'bad' && { backgroundColor: '#f6dce1' }, tone === 'danger' && { backgroundColor: colors.late, borderColor: colors.late }, disabled && { opacity: 0.45 }, pressed && { transform: [{ scale: 0.97 }] }]}>
  {icon}<Text style={[P.pillText, active && { color: colors.cream }, tone === 'good' && { color: '#286536' }, tone === 'bad' && { color: '#8e2538' }, tone === 'danger' && { color: colors.white }]}>{title}</Text>
</Pressable>;
const Empty = ({ icon, text }) => <View style={{ alignItems: 'center', paddingVertical: 48, gap: 10 }}><Ionicons name={icon} size={34} color={colors.pinkDeep}/><Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, textAlign: 'center' }}>{text}</Text></View>;
const confirm = (title, message, onYes) => Platform.OS === 'web'
  ? (globalThis.confirm?.(`${title}\n${message}`) && onYes())
  : Alert.alert(title, message, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: onYes }]);

// ---------- RESUMEN ----------
export function Summary({ orders, products, now }) {
  const [range, setRange] = useState(7);
  const day = useMemo(() => daySummary(orders, now), [orders, now]);
  const hourly = useMemo(() => hourlyOrders(orders, now), [orders, now]);
  const rank = useMemo(() => productRanking(orders, products, now, range), [orders, products, now, range]);
  const coupons = useMemo(() => couponPerformance(orders), [orders]);
  const people = useMemo(() => customerInsights(orders, now), [orders, now]);
  const used = hourly.hours.filter(h => h.today || h.typical);
  const from = used.length ? Math.max(0, Math.min(...used.map(h => h.hour)) - 1) : 12, to = used.length ? Math.min(23, Math.max(...used.map(h => h.hour)) + 1) : 23;
  const shown = hourly.hours.slice(from, to + 1), max = Math.max(1, ...shown.map(h => Math.max(h.today, h.typical)));
  const topMax = Math.max(1, ...rank.top.map(p => p.quantity));
  const weekday = new Date(now).toLocaleDateString('es-CL', { weekday: 'long' });
  return <View style={{ gap: 12 }}>
    <Text style={P.title}>Resumen del negocio</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {[['Ventas de hoy', money(day.sales), day.change === null ? `Sin datos del ${weekday} pasado` : `${day.change >= 0 ? '+' : ''}${day.change}% vs. el ${weekday} pasado`, day.change === null ? null : day.change >= 0 ? colors.good : colors.late],
        ['Pedidos de hoy', String(day.orders), `${day.delivery} delivery · ${day.orders - day.delivery} retiro`],
        ['Ticket promedio', money(day.average), 'Lo que gasta cada cliente hoy'],
        ['Hora peak', hourly.peakHour === null ? '—' : `${String(hourly.peakHour).padStart(2, '0')}:00`, hourly.peakHour === null ? 'Aún faltan datos' : 'Ten la plancha lista']].map(([l, v, sub, tone]) =>
        <View key={l} style={[P.box, { width: '48.5%', gap: 4 }]}><Text style={P.small}>{l}</Text><Text style={{ fontFamily: fonts.button, fontSize: 24 }}>{v}</Text><Text style={[P.small, { fontSize: 11 }, tone && { color: tone, fontFamily: fonts.bodyBold }]}>{sub}</Text></View>)}
    </View>
    <View style={[P.box, { gap: 10 }]}>
      <Text style={[P.title, { fontSize: 17 }]}>Pedidos por hora</Text>
      <View style={{ flexDirection: 'row', gap: 14 }}><Legend color={colors.pinkDeep} label="Hoy"/><Legend color="#b8892a" label={`Promedio ${weekday} (4 sem.)`}/></View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 130, gap: 2, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        {shown.map(h => <View key={h.hour} style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 1, height: '100%' }}>
          <View style={{ width: '40%', height: `${h.typical / max * 100}%`, backgroundColor: '#b8892a', borderTopLeftRadius: 3, borderTopRightRadius: 3 }}/>
          <View style={{ width: '40%', height: `${h.today / max * 100}%`, backgroundColor: colors.pinkDeep, borderTopLeftRadius: 3, borderTopRightRadius: 3 }}/>
        </View>)}
      </View>
      <View style={{ flexDirection: 'row' }}>{shown.map((h, i) => <Text key={h.hour} style={[P.small, { flex: 1, textAlign: 'center', fontSize: 9 }]}>{i % 2 ? '' : h.hour}</Text>)}</View>
    </View>
    <View style={[P.box, { gap: 10 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={[P.title, { fontSize: 17 }]}>Lo más vendido</Text><View style={{ flexDirection: 'row', gap: 6 }}>{[7, 30].map(d => <Pill key={d} title={`${d} días`} active={range === d} onPress={() => setRange(d)}/>)}</View></View>
      {rank.top.slice(0, 6).map(p => <View key={p.id} style={{ gap: 4 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><Text style={{ fontFamily: fonts.bodyBold, flex: 1 }}>{p.name}</Text><Text style={P.small}>{p.quantity} u. · {money(p.revenue)}</Text></View><View style={{ height: 6, borderTopRightRadius: 4, borderBottomRightRadius: 4, width: `${p.quantity / topMax * 100}%`, backgroundColor: colors.pinkDeep }}/></View>)}
      {!rank.top.length && <Text style={P.small}>Sin ventas en este período.</Text>}
      {rank.stale.length > 0 && <View style={{ backgroundColor: colors.warnBg, padding: 12 }}><Text style={{ fontFamily: fonts.body, color: colors.warn, fontSize: 12.5 }}><Text style={{ fontFamily: fonts.bodyBold }}>{rank.stale.length} productos sin ventas en {range} días:</Text> {rank.stale.slice(0, 6).map(p => p.name).join(', ')}. Prueba una promoción.</Text></View>}
    </View>
    <View style={[P.box, { gap: 8 }]}>
      <Text style={[P.title, { fontSize: 17 }]}>¿Funcionan tus cupones?</Text>
      {coupons.length ? coupons.map(c => <View key={c.code} style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: 8 }}><Text style={{ fontFamily: fonts.bodyBold }}>{c.code}</Text><Text style={P.small}>{c.uses} usos · −{money(c.discount)} · {money(c.sales)}</Text></View>) : <Text style={P.small}>Todavía ningún pedido usó un cupón.</Text>}
    </View>
    <View style={[P.box, { gap: 8 }]}>
      <Text style={[P.title, { fontSize: 17 }]}>Clientes</Text>
      <Text style={P.small}>{people.total} clientes distintos · {people.loyal.length} han vuelto a comprar.</Text>
      <Text style={{ fontFamily: fonts.bodyBold, marginTop: 6 }}>Más fieles</Text>
      {people.loyal.slice(0, 5).map(c => <Person key={c.phone} c={c} sub={`${c.orders} pedidos · ${money(c.spent)}`} msg={`¡Hola ${c.name}! Gracias por preferir SHET BURGER 🍔`}/>)}
      {!people.loyal.length && <Text style={P.small}>Aún no hay clientes que repitan.</Text>}
      <Text style={{ fontFamily: fonts.bodyBold, marginTop: 6 }}>Para recuperar <Text style={P.small}>(21+ días sin comprar)</Text></Text>
      {people.sleeping.slice(0, 5).map(c => <Person key={c.phone} c={c} sub={`Hace ${c.daysAway} días · ${c.orders} pedidos`} msg={`¡Hola ${c.name}! Te extrañamos en SHET BURGER 🍔 Vuelve esta semana.`}/>)}
      {!people.sleeping.length && <Text style={P.small}>Nadie se ha alejado. Buena señal.</Text>}
    </View>
  </View>;
}
const Legend = ({ color, label }) => <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }}/><Text style={P.small}>{label}</Text></View>;
const Person = ({ c, sub, msg }) => <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: 8 }}>
  <View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.bodyBold }}>{c.name}</Text><Text style={P.small}>{sub}</Text></View>
  <Pressable onPress={() => Linking.openURL(whatsappLink(c.phone, msg))} accessibilityLabel={`Escribir a ${c.name} por WhatsApp`} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.whatsapp, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="logo-whatsapp" size={22} color={colors.white}/></Pressable>
</View>;

// ---------- COCINA ----------
export function Kitchen({ orders, now, onAdvance }) {
  const queue = useMemo(() => kitchenQueue(orders, now), [orders, now]);
  return <View style={{ gap: 10 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}><Text style={P.title}>Cocina</Text><Text style={P.small}>{queue.orders.length} abiertos · {queue.orders.filter(o => o.late).length} atrasados</Text></View>
    {!queue.orders.length ? <Empty icon="time-outline" text="Todo al día. No hay pedidos por preparar."/> : <>
      <View style={[P.box, { gap: 8 }]}><Text style={[P.title, { fontSize: 17 }]}>Preparar ahora</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{queue.items.map(i => <View key={i.name} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.bone, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line }}><Text style={{ fontFamily: fonts.body }}><Text style={{ fontFamily: fonts.bodyBold }}>{i.quantity}×</Text> {i.name}</Text></View>)}</View></View>
      {queue.orders.map(o => { const next = ORDER_STAGES[getOrderStage(o) + 1]; return <View key={o.id} style={[P.box, { gap: 8, borderTopWidth: 4, borderTopColor: o.late ? colors.late : colors.ink }, o.late && { backgroundColor: colors.lateBg }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontFamily: fonts.button, fontSize: 17 }}>#{o.order_number}</Text><Text style={{ fontFamily: fonts.bodyBold, color: o.late ? colors.late : colors.ink }}>⏱ {o.minutes} min</Text></View>
        <Text style={P.small}>{o.customer?.name} · {o.mode === 'delivery' ? 'Delivery' : 'Retiro'}</Text>
        {o.items.map((it, i) => <View key={i}><Text style={{ fontFamily: fonts.body, fontSize: 15 }}><Text style={{ fontFamily: fonts.bodyBold }}>{it.quantity}×</Text> {it.product?.name || it.name}{it.variant ? ` (${it.variant})` : ''}</Text>
          {(it.selections || []).filter(s => s.label !== 'Entrega').map((s, k) => <Text key={k} style={P.small}>{s.label}: {s.value}</Text>)}
          {!!it.note && <Text style={[P.small, { color: colors.warn }]}>Nota: {it.note}</Text>}</View>)}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ fontFamily: fonts.body, color: colors.pinkDeep, fontSize: 12 }}>{o.status}</Text>{next && <Pill active title={`→ ${next.status}`} onPress={() => onAdvance(o, next)}/>}</View>
      </View>; })}
    </>}
  </View>;
}

// ---------- LOGÍSTICA ----------
export const Logistics = ({ orders }) => <View style={{ gap: 10 }}>
  <Text style={P.title}>Flujo operativo</Text>
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{ORDER_STAGES.map(s => <View key={s.stage} style={{ width: '48.5%', padding: 16, backgroundColor: colors.bone }}><Text style={{ fontFamily: fonts.button, fontSize: 11, color: colors.muted }}>{s.status.toUpperCase()}</Text><Text style={{ fontFamily: fonts.button, fontSize: 30 }}>{orders.filter(o => getOrderStage(o) === s.stage).length}</Text></View>)}</View>
</View>;

// ---------- COMPROBANTES ----------
export function Receipts({ orders, onOpen }) {
  const list = orders.filter(o => o.receipt_name || o.receipt_path);
  return <View style={{ gap: 10 }}>
    <Text style={P.title}>Comprobantes enviados</Text>
    {!list.length ? <Empty icon="document-text-outline" text="Sin comprobantes"/> : list.map(o => <ReceiptRow key={o.id} order={o} onOpen={onOpen}/>)}
  </View>;
}
function ReceiptRow({ order, onOpen }) {
  const [url, setUrl] = useState(null), [open, setOpen] = useState(false);
  useEffect(() => { if (open && order.receipt_path && !url) adminReceiptUrl(order.receipt_path).then(setUrl).catch(() => {}); }, [open, order.receipt_path, url]);
  return <View style={[P.box, { gap: 10 }]}>
    <Pressable onPress={() => onOpen(order)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Ionicons name="document-attach-outline" size={22} color={colors.pinkDeep}/>
      <View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.bodyBold }}>#{order.order_number} · {order.customer?.name}</Text><Text style={P.small}>{order.receipt_name || 'Comprobante'} · {money(order.total)}</Text></View>
    </Pressable>
    {order.receipt_path ? <Pill title={open ? 'Ocultar' : 'Ver comprobante'} onPress={() => setOpen(v => !v)}/> : <Text style={P.small}>El archivo no se subió.</Text>}
    {open && (url ? <Image source={{ uri: url }} style={{ width: '100%', aspectRatio: 0.7, backgroundColor: colors.bone }} contentFit="contain"/> : <ActivityIndicator color={colors.pinkDeep}/>)}
  </View>;
}

// ---------- DISPONIBILIDAD ----------
export function Availability({ token, products, stock, onDone, onError }) {
  const [busy, setBusy] = useState(null);
  const toggle = async p => {
    setBusy(p.id);
    const { error } = await adminSetAvailability(token, p.id, stock[p.id] === false);
    setBusy(null);
    if (error) return onError(error);
    onDone();
  };
  return <View style={{ gap: 8 }}>
    <Text style={P.title}>Disponibilidad</Text>
    {products.map(p => { const off = stock[p.id] === false; return <View key={p.id} style={[P.box, { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 }]}>
      <ProductPhoto product={p} style={{ width: 52, height: 52, borderRadius: 6 }}/>
      <View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.bodyBold }}>{p.name}</Text><Text style={P.small}>{p.category}</Text></View>
      <Pill tone={off ? 'bad' : 'good'} disabled={busy === p.id} title={busy === p.id ? '…' : off ? '✕ Agotado' : '✓ Disponible'} onPress={() => toggle(p)}/>
    </View>; })}
  </View>;
}

// ---------- PROMOCIONES (crear, editar, pausar y eliminar, como la web) ----------
const CATS = [['burgers', 'Hamburguesas'], ['promos', 'Promociones'], ['fritos', 'Fritos'], ['salsas', 'Salsas'], ['bebidas', 'Bebidas'], ['extras', 'Extras']];
const empty = { code: '', title: '', description: '', discount_type: 'percent', value: '', min_subtotal: '0', min_quantity: '2', buy_quantity: '2', pay_quantity: '1', scope: 'all', target: '', expires_at: '', published: true, active: true };
const toForm = (c, products) => {
  const ids = c.product_ids || [], scope = !ids.length ? 'all' : (c.scope_label || '').startsWith('Producto') ? 'product' : 'category';
  const exp = c.expires_at ? new Date(c.expires_at) : null;
  return { ...empty, ...Object.fromEntries(['code', 'title', 'description', 'discount_type'].map(k => [k, c[k] || ''])), value: ['percent', 'fixed', 'quantity_percent'].includes(c.discount_type) ? String(c.value ?? '') : '',
    min_subtotal: String(c.min_subtotal ?? 0), min_quantity: String(c.min_quantity ?? 2), buy_quantity: String(c.buy_quantity ?? 2), pay_quantity: String(c.pay_quantity ?? 1), scope,
    target: scope === 'product' ? ids[0] : scope === 'category' ? products.find(p => p.id === ids[0])?.category || '' : '',
    expires_at: exp ? `${exp.getFullYear()}-${String(exp.getMonth() + 1).padStart(2, '0')}-${String(exp.getDate()).padStart(2, '0')} ${String(exp.getHours()).padStart(2, '0')}:${String(exp.getMinutes()).padStart(2, '0')}` : '',
    published: c.published !== false, active: c.active !== false };
};

export function Coupons({ token, products, onError }) {
  const [view, setView] = useState('list'), [list, setList] = useState(null), [form, setForm] = useState(empty), [editing, setEditing] = useState(null), [busy, setBusy] = useState(false), [msg, setMsg] = useState(''), [err, setErr] = useState('');
  const load = useCallback(async () => { const { data, error } = await adminCoupons(token); if (error) return onError(error); setList(data || []); }, [token, onError]);
  useEffect(() => { load(); }, [load]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const needsValue = ['percent', 'fixed', 'quantity_percent'].includes(form.discount_type);
  const persist = async coupon => {
    setBusy(true); setErr(''); setMsg('');
    const { error } = await adminSaveCoupon(token, coupon);
    setBusy(false);
    if (error) { setErr(error.code === '23505' ? 'Ya existe un cupón con ese código.' : error.message); return false; }
    await load(); setMsg('Cupón guardado. El cambio ya está disponible en la página y la app.'); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    return true;
  };
  const submit = async () => {
    if (!/^[A-Za-z0-9_-]{3,30}$/.test(form.code)) return setErr('El código debe tener entre 3 y 30 letras, números, guiones o guiones bajos.');
    if (needsValue && !(Number(form.value) > 0)) return setErr('Escribe el descuento.');
    if (form.discount_type === 'buy_x_pay_y' && Number(form.pay_quantity) >= Number(form.buy_quantity)) return setErr('La cantidad a pagar debe ser menor que la que lleva el cliente.');
    const selected = form.scope === 'category' ? products.filter(p => p.category === form.target) : products.filter(p => p.id === form.target);
    if (form.discount_type !== 'free_delivery' && form.scope !== 'all' && !selected.length) return setErr('Elige productos participantes.');
    let expires = null;
    if (form.expires_at.trim()) { const d = new Date(form.expires_at.trim().replace(' ', 'T')); if (Number.isNaN(d.getTime())) return setErr('Vencimiento: usa el formato AAAA-MM-DD HH:MM.'); expires = d.toISOString(); }
    const scope_label = form.discount_type === 'free_delivery' ? 'Despacho.' : form.scope === 'category' ? `Categoría: ${CATS.find(c => c[0] === form.target)?.[1] || form.target} (productos seleccionados al crear la promoción).` : form.scope === 'product' ? `Producto: ${selected[0]?.name}.` : 'Todos los productos.';
    const ok = await persist({ ...form, ...(editing ? { id: editing, edit: true } : {}), code: form.code.toUpperCase(), product_ids: form.discount_type === 'free_delivery' || form.scope === 'all' ? [] : selected.map(p => p.id), scope_label,
      value: needsValue ? Number(form.value) : 1, min_subtotal: Number(form.min_subtotal) || 0, min_quantity: Number(form.min_quantity) || 2, buy_quantity: Number(form.buy_quantity) || 2, pay_quantity: Number(form.pay_quantity) || 1, expires_at: expires });
    if (ok) { setForm(empty); setEditing(null); setView('list'); }
  };
  const remove = c => confirm('¿Eliminar este cupón?', `${c.code} dejará de funcionar en la página y la app.`, async () => {
    const { error } = await adminDeleteCoupon(token, c.id); if (error) return setErr(error.message); setMsg(`Cupón ${c.code} eliminado.`); load();
  });
  const targets = form.scope === 'category' ? CATS.filter(c => products.some(p => p.category === c[0])).map(([id, name]) => ({ id, name })) : products;

  return <View style={{ gap: 12 }}>
    <Text style={P.title}>Cupones y promociones</Text>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Pill title={editing ? 'Editar promoción' : 'Crear promoción'} active={view === 'form'} onPress={() => { setView('form'); setErr(''); setMsg(''); }}/>
      <Pill title={`Cupones creados ${list?.length ?? ''}`} active={view === 'list'} onPress={() => { setView('list'); setEditing(null); setForm(empty); setErr(''); }}/>
    </View>
    {!!err && <Text style={{ fontFamily: fonts.bodyBold, color: colors.late }}>{err}</Text>}
    {!!msg && <Text style={{ fontFamily: fonts.body, color: colors.good }}>{msg}</Text>}
    {view === 'form' ? <View style={[P.box, { gap: 12 }]}>
      {editing && <Text style={{ fontFamily: fonts.body, color: colors.warn, backgroundColor: colors.warnBg, padding: 10 }}>Editando {form.code}. Los pedidos ya hechos mantienen su descuento.</Text>}
      <In label="Código" value={form.code} onChange={v => set('code', v.toUpperCase())} placeholder="SHET10" autoCapitalize="characters"/>
      <In label="Nombre de la promoción" value={form.title} onChange={v => set('title', v)} placeholder="Martes de 2×1"/>
      <Text style={lab}>Tipo de promoción</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{promotionTypes.map(([id, l]) => <Chip key={id} label={l} active={form.discount_type === id} onPress={() => set('discount_type', id)}/>)}</View>
      {needsValue && <In label={form.discount_type === 'fixed' ? 'Descuento ($)' : 'Descuento (%)'} value={form.value} onChange={v => set('value', v.replace(/\D/g, ''))} keyboardType="number-pad"/>}
      {form.discount_type === 'buy_x_pay_y' && <View style={{ flexDirection: 'row', gap: 10 }}><In style={{ flex: 1 }} label="Unidades que lleva" value={form.buy_quantity} onChange={v => set('buy_quantity', v.replace(/\D/g, ''))} keyboardType="number-pad"/><In style={{ flex: 1 }} label="Unidades que paga" value={form.pay_quantity} onChange={v => set('pay_quantity', v.replace(/\D/g, ''))} keyboardType="number-pad"/></View>}
      {form.discount_type === 'quantity_percent' && <In label="Unidades mínimas participantes" value={form.min_quantity} onChange={v => set('min_quantity', v.replace(/\D/g, ''))} keyboardType="number-pad"/>}
      {form.discount_type !== 'free_delivery' && <>
        <Text style={lab}>Aplicar a</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>{[['all', 'Todos'], ['category', 'Una categoría'], ['product', 'Un producto']].map(([id, l]) => <Chip key={id} label={l} active={form.scope === id} onPress={() => setForm(f => ({ ...f, scope: id, target: '' }))}/>)}</View>
        {form.scope !== 'all' && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{targets.map(t => <Chip key={t.id} label={t.name} active={form.target === t.id} onPress={() => set('target', t.id)}/>)}</View>}
      </>}
      <In label="Descripción (opcional)" value={form.description} onChange={v => set('description', v)} placeholder="Cuéntale al cliente de qué se trata"/>
      <In label="Compra mínima en productos ($)" value={form.min_subtotal} onChange={v => set('min_subtotal', v.replace(/\D/g, ''))} keyboardType="number-pad"/>
      <In label="Vencimiento (opcional) · AAAA-MM-DD HH:MM" value={form.expires_at} onChange={v => set('expires_at', v)} placeholder="2026-12-31 23:59"/>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ fontFamily: fonts.bodyBold }}>Mostrar en la página de pedidos</Text><Switch value={form.published} onValueChange={v => set('published', v)} trackColor={{ true: colors.pink }}/></View>
      <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: colors.ink, padding: 12, gap: 4 }}><Text style={{ fontFamily: fonts.bodyBold }}>Vista previa: {form.title || 'Tu promoción'}</Text><Text style={{ fontFamily: fonts.body }}>{couponLabel({ ...form, value: Number(form.value) || 0, buy_quantity: Number(form.buy_quantity), pay_quantity: Number(form.pay_quantity), min_quantity: Number(form.min_quantity) })}</Text></View>
      <View style={{ flexDirection: 'row', gap: 8 }}><Pill active title={busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear promoción'} disabled={busy} onPress={submit}/>{editing && <Pill title="Cancelar" onPress={() => { setEditing(null); setForm(empty); setView('list'); }}/>}</View>
    </View> : !list ? <ActivityIndicator color={colors.pinkDeep}/> : !list.length ? <Text style={P.small}>Aún no hay promociones creadas.</Text> :
      list.map(c => <View key={c.id} style={[P.box, { gap: 6 }]}>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15 }}>{c.title || c.code}</Text>
        <Text style={{ fontFamily: fonts.bodyBold }}>{c.code} · {couponLabel(c)}</Text>
        <Text style={P.small}>Mínimo {money(c.min_subtotal)} · {c.active ? 'Activa' : 'Pausada'}</Text>
        <Text style={P.small}>{couponConditions(c)}</Text>
        <Text style={P.small}>{c.expires_at ? `Vence ${new Date(c.expires_at).toLocaleString('es-CL')}` : 'Sin vencimiento'} · {c.published ? 'Visible en la página' : 'Solo con código'}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
          <Pill title="Editar" onPress={() => { setForm(toForm(c, products)); setEditing(c.id); setView('form'); setMsg(''); setErr(''); }}/>
          <Pill title={c.active ? 'Pausar' : 'Activar'} onPress={() => persist({ ...c, active: !c.active })}/>
          <Pill tone="danger" title="Eliminar" onPress={() => remove(c)}/>
        </View>
      </View>)}
  </View>;
}
const lab = { fontFamily: fonts.bodyBold, fontSize: 13 };
const In = ({ label, value, onChange, style, ...rest }) => <View style={[{ gap: 6 }, style]}><Text style={lab}>{label}</Text><TextInput value={value} onChangeText={onChange} placeholderTextColor={colors.mutedLight} style={{ minHeight: 46, borderWidth: 1, borderColor: '#bbb', borderRadius: 6, paddingHorizontal: 12, fontFamily: fonts.body, fontSize: 16, color: colors.ink, backgroundColor: colors.white }} {...rest}/></View>;

// ---------- ZONAS DE DESPACHO ----------
export function Zones({ token, onError }) {
  const [zones, setZones] = useState(null), [busy, setBusy] = useState(false), [msg, setMsg] = useState('');
  useEffect(() => { loadZones({ includeInactive: true }).then(setZones).catch(e => onError(e)); }, [onError]);
  const set = (id, changes) => setZones(list => list.map(z => z.id === id ? { ...z, ...changes } : z));
  const save = async () => {
    setBusy(true); setMsg('');
    const { error } = await adminSaveZones(token, zones);
    setBusy(false);
    if (error) return onError(error);
    setMsg('Zonas guardadas. El despacho ya se calcula con estos valores.'); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };
  if (!zones) return <ActivityIndicator color={colors.pinkDeep}/>;
  return <View style={{ gap: 10 }}>
    <Text style={P.title}>Zonas de despacho</Text>
    <DeliveryMap readOnly zones={zones} point={null} style={{ width: '100%', height: 300, borderWidth: 1, borderColor: colors.line }}/>
    <Text style={P.small}>Cambia la tarifa o pausa una zona y guarda: el mapa de envío de la web y la app se actualiza al instante. Para dibujar el contorno usa el panel web.</Text>
    {zones.map(z => <View key={z.id} style={[P.box, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
      <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: z.color }}/>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={{ fontFamily: fonts.bodyBold }}>{z.label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Text style={P.small}>Tarifa $</Text><TextInput value={String(z.fee)} onChangeText={v => set(z.id, { fee: Number(v.replace(/\D/g, '')) || 0 })} keyboardType="number-pad" style={{ minWidth: 90, minHeight: 40, borderWidth: 1, borderColor: '#bbb', borderRadius: 6, paddingHorizontal: 10, fontFamily: fonts.body, fontSize: 16, color: colors.ink }}/></View>
      </View>
      <View style={{ alignItems: 'center' }}><Switch value={z.active !== false} onValueChange={v => set(z.id, { active: v })} trackColor={{ true: colors.pink }}/><Text style={P.small}>{z.active !== false ? 'Activa' : 'Pausada'}</Text></View>
    </View>)}
    {!!msg && <Text style={{ fontFamily: fonts.body, color: colors.good }}>{msg}</Text>}
    <Pill active title={busy ? 'Guardando…' : 'Guardar zonas'} disabled={busy} onPress={save}/>
  </View>;
}

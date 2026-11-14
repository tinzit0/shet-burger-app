import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Button, Card, Chip, Display, Eyebrow, Field, Notice, ProductPhoto } from '../../components/ui';
import { useApp } from '../../lib/store';
import { adminCoupons, adminLogin, adminOrders, adminReceiptUrl, adminSaveCoupon, adminSetAvailability, adminSetStatus, adminSetStoreOpen, subscribe } from '../../lib/api';
import { colors, money } from '../../lib/theme';
import { ORDER_STAGES, getOrderStage } from '../../shared/orderStatus.js';
import { daySummary, isLate, kitchenQueue, minutesSince, productRanking } from '../../shared/insights.js';
import { couponConditions, couponLabel } from '../../shared/couponRules.js';
import { deliveryMapsUrl, displayDeliveryAddress } from '../../shared/delivery.js';

export default function Admin() {
  const { adminToken, setAdminToken, hydrated } = useApp();
  if (!hydrated) return <View style={st.center}><ActivityIndicator color={colors.pinkDeep}/></View>;
  return adminToken ? <Panel token={adminToken} onSignOut={() => setAdminToken(null)}/> : <Login onToken={setAdminToken}/>;
}

function Login({ onToken }) {
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const submit = async () => {
    setBusy(true); setError('');
    try { onToken(await adminLogin(email, password)); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }
    catch (e) { setError(e.message); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}); }
    finally { setBusy(false); }
  };
  return <ScrollView style={{ backgroundColor: colors.paper }} contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
    <Eyebrow>Área privada</Eyebrow>
    <Display size={44}>Bienvenido{'\n'}<Text style={{ color: colors.pinkDeep }}>de vuelta.</Text></Display>
    <Text style={{ color: colors.muted }}>Usa el mismo correo y contraseña del panel web.</Text>
    <Field label="Correo" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="username"/>
    <Field label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" textContentType="password" onSubmitEditing={submit}/>
    {!!error && <Notice tone="bad">{error}</Notice>}
    <Button title={busy ? 'Conectando…' : 'Entrar al panel'} onPress={submit} disabled={busy || !email || !password}/>
  </ScrollView>;
}

const TABS = [['orders', 'Pedidos'], ['kitchen', 'Cocina'], ['summary', 'Resumen'], ['stock', 'Stock'], ['coupons', 'Cupones']];

function Panel({ token, onSignOut }) {
  const { products, stock, storeOpen, refresh } = useApp();
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [fresh, setFresh] = useState([]);
  const [sound, setSound] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());
  const seen = useRef(null);
  const player = useAudioPlayer(require('../../../assets/sounds/nuevo-pedido.wav'));

  useEffect(() => { setAudioModeAsync({ playsInSilentMode: true }).catch(() => {}); }, []);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);

  const load = useCallback(async () => {
    try { setOrders(await adminOrders()); setError(''); }
    catch (e) { setError(e.message || 'No se pudieron cargar los pedidos.'); }
  }, []);
  useEffect(() => { load(); const off = subscribe('orders', load); const t = setInterval(load, 60000); return () => { off(); clearInterval(t); }; }, [load]);

  // Pedido nuevo: suena el timbre, vibra y aparece un aviso arriba.
  useEffect(() => {
    const ids = orders.map(o => o.id);
    if (seen.current === null) { if (ids.length) seen.current = new Set(ids); return; }
    const added = orders.filter(o => !seen.current.has(o.id) && minutesSince(o) < 10);
    ids.forEach(id => seen.current.add(id));
    if (!added.length) return;
    setFresh(list => [...added, ...list].slice(0, 3));
    if (sound) { try { player.seekTo(0); player.play(); } catch {} }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  }, [orders, sound, player]);

  const advance = async (order, next) => {
    setOrders(list => list.map(o => o.id === order.id ? { ...o, status: next.status, stage: next.stage } : o));
    setSelected(cur => cur?.id === order.id ? { ...cur, status: next.status, stage: next.stage } : cur);
    const { error: e } = await adminSetStatus(order, next.status, next.stage);
    if (e) { setError(e.message); load(); } else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };
  const toggleStore = async () => {
    const { error: e } = await adminSetStoreOpen(token, !storeOpen);
    if (e) return handleAuth(e);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); refresh();
  };
  const handleAuth = e => { if (/sesi[oó]n|token|vencid/i.test(e.message)) { Alert.alert('Sesión vencida', 'Vuelve a ingresar.'); onSignOut(); } else setError(e.message); };

  const open = orders.filter(o => getOrderStage(o) < 2);
  const late = orders.filter(o => isLate(o, now)).length;

  return <View style={{ flex: 1, backgroundColor: colors.paper }}>
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await Promise.all([load(), refresh()]); setRefreshing(false); }} tintColor={colors.pinkDeep}/>}>
      <View style={st.store}>
        <View style={{ flex: 1 }}><Text style={{ color: colors.pink, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 }}>ESTADO DE LA TIENDA</Text><Text style={{ color: colors.cream, fontWeight: '800', fontSize: 17, marginTop: 2 }}>{storeOpen ? 'Tienda abierta' : 'Tienda cerrada'}</Text><Text style={{ color: colors.mutedLight, fontSize: 12 }}>{storeOpen ? 'Los clientes pueden pedir' : 'Pedidos pausados en web y app'}</Text></View>
        <Switch value={storeOpen} onValueChange={toggleStore} trackColor={{ true: colors.pink, false: '#555' }} thumbColor={colors.cream} accessibilityLabel="Abrir o cerrar la tienda"/>
      </View>

      {fresh.map(o => <Pressable key={o.id} onPress={() => { setFresh(list => list.filter(x => x.id !== o.id)); setSelected(o); }} style={({ pressed }) => [st.fresh, pressed && { transform: [{ scale: 0.98 }] }]}>
        <Text style={{ fontWeight: '800', flex: 1 }}>🔔 Nuevo pedido #{o.order_number} · {o.customer?.name} · {money(o.total)}</Text><Text style={{ fontWeight: '900', fontSize: 12 }}>VER</Text>
      </Pressable>)}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Chip label={sound ? '🔔 Sonido activado' : '🔕 Sonido apagado'} active={sound} onPress={() => { const next = !sound; setSound(next); if (next) { try { player.seekTo(0); player.play(); } catch {} } }}/>
        <Button small variant="ghost" title="Salir" onPress={onSignOut}/>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {TABS.map(([id, label]) => <Chip key={id} label={id === 'kitchen' ? `${label} ${open.length}${late ? ' · ⚠' : ''}` : id === 'orders' ? `${label} ${orders.length}` : label} active={tab === id} onPress={() => setTab(id)}/>)}
      </ScrollView>
      {!!error && <Notice tone="bad">{error}</Notice>}

      {tab === 'orders' && <Orders orders={orders} now={now} onOpen={setSelected}/>}
      {tab === 'kitchen' && <Kitchen orders={orders} now={now} onAdvance={advance}/>}
      {tab === 'summary' && <Summary orders={orders} products={products} now={now}/>}
      {tab === 'stock' && <Stock token={token} products={products} stock={stock} onDone={refresh} onError={handleAuth}/>}
      {tab === 'coupons' && <Coupons token={token} onError={handleAuth}/>}
    </ScrollView>
    <OrderSheet order={selected} onClose={() => setSelected(null)} onAdvance={advance}/>
  </View>;
}

function Orders({ orders, now, onOpen }) {
  const [filter, setFilter] = useState('open');
  const list = orders.filter(o => filter === 'all' || (filter === 'open' ? getOrderStage(o) < 3 : getOrderStage(o) === 3));
  return <View style={{ gap: 10 }}>
    <View style={{ flexDirection: 'row', gap: 8 }}>{[['open', 'Activos'], ['done', 'Entregados'], ['all', 'Todos']].map(([id, l]) => <Chip key={id} label={l} active={filter === id} onPress={() => setFilter(id)}/>)}</View>
    {!list.length && <Card><Text style={{ color: colors.muted }}>No hay pedidos aquí.</Text></Card>}
    {list.slice(0, 80).map(o => <Pressable key={o.id} onPress={() => onOpen(o)} style={({ pressed }) => [pressed && { opacity: 0.8 }]}>
      <Card style={[{ flexDirection: 'row', gap: 12 }, isLate(o, now) && { borderColor: colors.late, backgroundColor: colors.lateBg }]}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 12, color: colors.muted }}>#{o.order_number}</Text>
          <Text style={{ fontFamily: 'Anton', fontSize: 18, textTransform: 'uppercase' }}>{o.customer?.name || 'Cliente'}</Text>
          <Text style={{ fontSize: 12, color: colors.muted }}>{o.items?.length || 0} productos · {o.mode === 'delivery' ? 'Delivery' : 'Retiro'}{o.receipt_path ? ' · Comprobante' : ''}</Text>
          {getOrderStage(o) < 2 && <Text style={{ fontSize: 12, fontWeight: '700', color: isLate(o, now) ? colors.late : colors.muted }}>Esperando hace {minutesSince(o, now)} min{isLate(o, now) ? ' · ATRASADO' : ''}</Text>}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}><Text style={{ fontWeight: '800' }}>{money(o.total)}</Text><Text style={{ fontSize: 12, color: colors.pinkDeep }}>{o.status}</Text></View>
      </Card>
    </Pressable>)}
  </View>;
}

function Kitchen({ orders, now, onAdvance }) {
  const queue = useMemo(() => kitchenQueue(orders, now), [orders, now]);
  if (!queue.orders.length) return <Card><Text style={{ color: colors.muted }}>Todo al día. No hay pedidos por preparar.</Text></Card>;
  return <View style={{ gap: 10 }}>
    <Card style={{ gap: 8 }}><Display size={18}>Preparar ahora</Display><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{queue.items.map(i => <View key={i.name} style={st.pill}><Text style={{ fontSize: 14 }}><Text style={{ fontWeight: '900' }}>{i.quantity}×</Text> {i.name}</Text></View>)}</View></Card>
    {queue.orders.map(o => { const next = ORDER_STAGES[getOrderStage(o) + 1]; return <Card key={o.id} style={[{ gap: 8, borderTopWidth: 4, borderTopColor: colors.ink }, o.late && { borderTopColor: colors.late, backgroundColor: colors.lateBg }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontFamily: 'Anton', fontSize: 18 }}>#{o.order_number}</Text><Text style={{ fontWeight: '800', color: o.late ? colors.late : colors.ink }}>⏱ {o.minutes} min</Text></View>
      <Text style={{ color: colors.muted, fontSize: 12 }}>{o.customer?.name} · {o.mode === 'delivery' ? 'Delivery' : 'Retiro'}</Text>
      {o.items.map((it, i) => <View key={i}><Text style={{ fontSize: 15 }}><Text style={{ fontWeight: '900' }}>{it.quantity}×</Text> {it.product?.name || it.name}{it.variant ? ` (${it.variant})` : ''}</Text>
        {(it.selections || []).filter(s => s.label !== 'Entrega').map((s, k) => <Text key={k} style={{ fontSize: 12, color: colors.muted }}>{s.label}: {s.value}</Text>)}
        {!!it.note && <Text style={{ fontSize: 12, color: colors.warn }}>Nota: {it.note}</Text>}</View>)}
      {next && <Button small title={`→ ${next.status}`} onPress={() => onAdvance(o, next)}/>}
    </Card>; })}
  </View>;
}

function Summary({ orders, products, now }) {
  const day = useMemo(() => daySummary(orders, now), [orders, now]);
  const rank = useMemo(() => productRanking(orders, products, now, 7), [orders, products, now]);
  const max = Math.max(1, ...rank.top.map(p => p.quantity));
  return <View style={{ gap: 10 }}>
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <Kpi label="Ventas de hoy" value={money(day.sales)} sub={day.change === null ? 'Sin datos de la semana pasada' : `${day.change >= 0 ? '+' : ''}${day.change}% vs. semana pasada`} tone={day.change === null ? null : day.change >= 0 ? colors.good : colors.late}/>
      <Kpi label="Pedidos" value={String(day.orders)} sub={`${day.delivery} delivery · ${day.orders - day.delivery} retiro`}/>
    </View>
    <Kpi label="Ticket promedio" value={money(day.average)} sub="Lo que gasta cada cliente hoy"/>
    <Card style={{ gap: 10 }}><Display size={18}>Lo más vendido · 7 días</Display>
      {rank.top.slice(0, 6).map(p => <View key={p.id} style={{ gap: 4 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontWeight: '700', flex: 1 }}>{p.name}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{p.quantity} u. · {money(p.revenue)}</Text></View><View style={{ height: 6, borderRadius: 3, width: `${p.quantity / max * 100}%`, backgroundColor: colors.pinkDeep }}/></View>)}
      {!rank.top.length && <Text style={{ color: colors.muted }}>Sin ventas en 7 días.</Text>}
    </Card>
  </View>;
}
const Kpi = ({ label, value, sub, tone }) => <Card style={{ flex: 1, gap: 4 }}><Text style={{ fontSize: 12, color: colors.muted }}>{label}</Text><Display size={26}>{value}</Display><Text style={{ fontSize: 11.5, color: tone || colors.muted, fontWeight: tone ? '700' : '400' }}>{sub}</Text></Card>;

function Stock({ token, products, stock, onDone, onError }) {
  const [busy, setBusy] = useState(null);
  const toggle = async p => {
    setBusy(p.id);
    const { error } = await adminSetAvailability(token, p.id, stock[p.id] === false);
    setBusy(null);
    if (error) return onError(error);
    Haptics.selectionAsync().catch(() => {}); onDone();
  };
  return <View style={{ gap: 8 }}>{products.map(p => { const off = stock[p.id] === false; return <Card key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 }}>
    <ProductPhoto product={p} style={{ width: 48, height: 48, borderRadius: 10 }}/>
    <View style={{ flex: 1 }}><Text style={{ fontWeight: '700' }}>{p.name}</Text><Text style={{ fontSize: 12, color: colors.muted }}>{p.category}</Text></View>
    <Pressable disabled={busy === p.id} onPress={() => toggle(p)} style={({ pressed }) => [st.stockBtn, off ? { backgroundColor: '#f6dce1' } : { backgroundColor: colors.goodBg }, pressed && { transform: [{ scale: 0.96 }] }]}>
      <Text style={{ fontWeight: '800', fontSize: 11, color: off ? '#8e2538' : colors.good }}>{busy === p.id ? '…' : off ? 'AGOTADO' : 'DISPONIBLE'}</Text>
    </Pressable>
  </Card>; })}</View>;
}

function Coupons({ token, onError }) {
  const [list, setList] = useState(null);
  const load = useCallback(async () => { const { data, error } = await adminCoupons(token); if (error) return onError(error); setList(data || []); }, [token, onError]);
  useEffect(() => { load(); }, [load]);
  const toggle = async c => { const { error } = await adminSaveCoupon(token, { ...c, active: !c.active }); if (error) return onError(error); Haptics.selectionAsync().catch(() => {}); load(); };
  if (!list) return <ActivityIndicator color={colors.pinkDeep}/>;
  return <View style={{ gap: 8 }}>
    <Text style={{ color: colors.muted, fontSize: 12 }}>Para crear o editar promociones usa el panel web; aquí puedes pausarlas o activarlas al instante.</Text>
    {!list.length && <Card><Text style={{ color: colors.muted }}>Aún no hay promociones.</Text></Card>}
    {list.map(c => <Card key={c.id} style={{ gap: 6 }}>
      <Text style={{ fontWeight: '800', fontSize: 15 }}>{c.title || c.code}</Text>
      <Text style={{ fontWeight: '700' }}>{c.code} · {couponLabel(c)}</Text>
      <Text style={{ fontSize: 12, color: colors.muted }}>{couponConditions(c)}</Text>
      <Button small variant={c.active ? 'outline' : 'primary'} title={c.active ? 'Pausar' : 'Activar'} onPress={() => toggle(c)} style={{ alignSelf: 'flex-start' }}/>
    </Card>)}
  </View>;
}

function OrderSheet({ order, onClose, onAdvance }) {
  const [receipt, setReceipt] = useState(null);
  useEffect(() => { setReceipt(null); if (order?.receipt_path) adminReceiptUrl(order.receipt_path).then(setReceipt).catch(() => {}); }, [order?.id, order?.receipt_path]);
  if (!order) return null;
  const stage = getOrderStage(order), map = order.mode === 'delivery' ? deliveryMapsUrl(order.address) : null, phone = order.customer?.phone;
  return <Modal visible animationType="slide" presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'} onRequestClose={onClose}>
    <ScrollView style={{ backgroundColor: colors.paper }} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Eyebrow>Pedido #{order.order_number}</Eyebrow><Button small variant="outline" title="Cerrar" onPress={onClose}/></View>
      <Display size={34}>{order.customer?.name || 'Cliente'}</Display>
      <Text style={{ fontWeight: '700' }}>{order.mode === 'delivery' ? `DELIVERY · ${displayDeliveryAddress(order.address)}` : 'RETIRO EN EL CARRITO'}</Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {phone && <Button small variant="outline" title="Llamar" onPress={() => Linking.openURL(`tel:${phone}`)}/>}
        {phone && <Button small variant="outline" title="WhatsApp" onPress={() => Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}`)}/>}
        {map && <Button small variant="outline" title="Abrir en Maps" onPress={() => Linking.openURL(map)}/>}
      </View>
      <Card style={{ gap: 8 }}>
        {order.items.map((it, i) => <View key={i}><View style={{ flexDirection: 'row', gap: 8 }}><Text style={{ flex: 1 }}>{it.quantity} × {it.product?.name || it.name}{it.variant ? ` (${it.variant})` : ''}</Text><Text style={{ fontWeight: '700' }}>{money(it.price * it.quantity)}</Text></View>
          {(it.selections || []).filter(s => s.label !== 'Entrega').map((s, k) => <Text key={k} style={{ fontSize: 12, color: colors.muted }}>{s.label}: {s.value}</Text>)}
          {!!it.note && <Text style={{ fontSize: 12, color: colors.warn }}>Instrucción: {it.note}</Text>}</View>)}
        {!!order.coupon_code && <Text style={{ color: colors.good }}>Cupón {order.coupon_code}: −{money(order.discount_amount)}</Text>}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: 8 }}><Text>Total</Text><Display size={24}>{money(order.total)}</Display></View>
      </Card>
      <Eyebrow color={colors.muted}>Actualizar estado</Eyebrow>
      <View style={{ gap: 8 }}>{ORDER_STAGES.slice(1).map(s => <Button key={s.stage} small variant={stage === s.stage ? 'pink' : 'outline'} title={s.status} onPress={() => onAdvance(order, s)}/>)}</View>
      {receipt && <View style={{ gap: 8 }}><Eyebrow color={colors.muted}>Comprobante</Eyebrow><Image source={{ uri: receipt }} style={{ width: '100%', aspectRatio: 0.7, borderRadius: 12, backgroundColor: colors.white }} contentFit="contain"/></View>}
      {order.receipt_path && !receipt && <Text style={{ color: colors.muted }}>Cargando comprobante…</Text>}
    </ScrollView>
  </Modal>;
}

const st = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
  store: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.ink, borderRadius: 18, padding: 16 },
  fresh: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.pink, borderRadius: 14, padding: 14 },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.bone, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  stockBtn: { minHeight: 40, paddingHorizontal: 12, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});

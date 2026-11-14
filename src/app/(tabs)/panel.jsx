import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Display, Eyebrow, Field, Notice } from '../../components/ui';
import { GoogleButton } from '../../components/GoogleButton';
import DeliveryMap from '../../components/DeliveryMap';
import { signOut } from '../../lib/auth';
import { parsePointFromAddress } from '../../shared/geo.js';
import { Availability, Coupons, Kitchen, Logistics, P, Pill, Receipts, Summary, Zones } from '../../components/panelSections';
import { useApp } from '../../lib/store';
import { adminDeleteOrder, adminLogin, adminOrders, adminReceiptUrl, adminSetStatus, adminSetStoreOpen, subscribe } from '../../lib/api';
import { colors, fonts, money } from '../../lib/theme';
import { ORDER_STAGES, getOrderStage } from '../../shared/orderStatus.js';
import { isLate, minutesSince } from '../../shared/insights.js';
import { deliveryMapsUrl, displayDeliveryAddress, getDeliveryZoneFromAddress } from '../../shared/delivery.js';

// Panel del dueño: misma estructura y textos que /admin de la web
// (PANEL DE CONTROL · OPERACIÓN SHET., sincronización, tienda, indicadores y 8 secciones).

export default function Admin() {
  const { adminToken, setAdminToken, hydrated, auth, isOwner } = useApp();
  const insets = useSafeAreaInsets();
  const leave = () => { if (adminToken) setAdminToken(null); else signOut(); };
  return <View style={{ flex: 1, backgroundColor: colors.paper }}>
    <View style={[st.topbar, { paddingTop: insets.top + 8 }]}>
      <Image source={require('../../../assets/logo.png')} style={{ width: 40, height: 40, borderRadius: 20 }}/>
      <Text style={st.brand}>SHET BURGER <Text style={{ color: colors.pink }}>ADMIN</Text></Text>
      <View style={{ flex: 1 }}/>
      {isOwner && <Pressable onPress={leave} hitSlop={8} style={st.topBtn}><Ionicons name="log-out-outline" size={18} color={colors.cream}/><Text style={st.topBtnText}>Salir</Text></Pressable>}
    </View>
    {!hydrated ? <View style={st.center}><ActivityIndicator color={colors.pinkDeep}/></View>
      : isOwner ? <Panel token={adminToken || null} onSignOut={leave}/> : <Login onToken={setAdminToken} auth={auth}/>}
  </View>;
}

function Login({ onToken, auth }) {
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const submit = async () => {
    setBusy(true); setError('');
    try { onToken(await adminLogin(email, password)); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }
    catch (e) { setError(e.message); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}); }
    finally { setBusy(false); }
  };
  return <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
    <Eyebrow>Área privada</Eyebrow>
    <Display size={44}>Bienvenido{'\n'}<Text style={{ color: colors.pinkDeep }}>de vuelta.</Text></Display>
    <Field label="Correo" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="username"/>
    <Field label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" textContentType="password" onSubmitEditing={submit}/>
    {!!error && <Notice tone="bad">{error}</Notice>}
    <Button title={busy ? 'Conectando…' : 'Entrar al panel'} onPress={submit} disabled={busy || !email || !password}/>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={st.or}/><Text style={P.small}>o</Text><View style={st.or}/></View>
    {/* Igual que la web: la cuenta de Google debe estar registrada como administradora. */}
    {auth.user && !auth.isAdmin ? <View style={{ gap: 10 }}>
      <Notice tone="bad">La cuenta {auth.user.email} no está registrada como administradora.</Notice>
      <Button variant="outline" title="Usar otra cuenta" onPress={() => signOut()}/>
    </View> : <GoogleButton label="Entrar con Google"/>}
    <Text style={P.small}>Usa el mismo correo y contraseña del panel web. Este acceso guarda los cambios en todos los dispositivos.</Text>
  </ScrollView>;
}

const TABS = ['summary', 'orders', 'kitchen', 'logistics', 'receipts', 'products', 'coupons', 'zones'];

function Panel({ token, onSignOut }) {
  const { products, stock, storeOpen, refresh } = useApp();
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [fresh, setFresh] = useState([]);
  const [sound, setSound] = useState(true);
  const [sync, setSync] = useState('connecting');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());
  const seen = useRef(null);
  const player = useAudioPlayer(require('../../../assets/sounds/nuevo-pedido.wav'));

  useEffect(() => { setAudioModeAsync({ playsInSilentMode: true }).catch(() => {}); }, []);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  const load = useCallback(async () => {
    try { setOrders(await adminOrders()); setError(''); setSync('live'); }
    catch (e) { setError(e.message || 'No se pudieron cargar los pedidos.'); setSync('degraded'); }
  }, []);
  useEffect(() => { load(); const off = subscribe('orders', load); const t = setInterval(load, 60000); return () => { off(); clearInterval(t); }; }, [load]);

  // Pedido nuevo: timbre, vibración y aviso rosado arriba (igual que la web).
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

  const handleAuth = useCallback(e => { if (/sesi[oó]n|token|vencid/i.test(e?.message || '')) { Alert.alert('Sesión vencida', 'Vuelve a ingresar.'); onSignOut(); } else setError(e?.message || 'Error'); }, [onSignOut]);
  const advance = async (order, next) => {
    setOrders(list => list.map(o => o.id === order.id ? { ...o, status: next.status, stage: next.stage } : o));
    setSelected(cur => cur?.id === order.id ? { ...cur, status: next.status, stage: next.stage } : cur);
    const { error: e } = await adminSetStatus(order, next.status, next.stage);
    if (e) { setError(e.message); load(); } else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };
  const removeOrder = async order => {
    const { error: e } = await adminDeleteOrder(order);
    if (e) return setError(e.message);
    setSelected(null); setOrders(list => list.filter(o => o.id !== order.id));
  };
  const toggleStore = async () => {
    const { error: e } = await adminSetStoreOpen(token, !storeOpen);
    if (e) return handleAuth(e);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); refresh();
  };

  const pending = orders.filter(o => getOrderStage(o) < 2).length;
  const late = orders.some(o => isLate(o, now));
  const receipts = orders.filter(o => o.receipt_name || o.receipt_path).length;
  const labels = { summary: 'Resumen', orders: `Pedidos ${orders.length}`, kitchen: `Cocina ${pending}`, logistics: 'Logística', receipts: `Comprobantes ${receipts}`, products: 'Disponibilidad', coupons: 'Promociones', zones: 'Zonas de despacho' };

  return <View style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.pinkDeep} onRefresh={async () => { setRefreshing(true); await Promise.all([load(), refresh()]); setRefreshing(false); }}/>}>
      <View>
        <Text style={st.kicker}>PANEL DE CONTROL</Text>
        <Text style={st.h1}>OPERACIÓN{'\n'}<Text style={{ color: colors.pinkDeep }}>SHET.</Text></Text>
        <Text style={[P.small, { fontSize: 14, marginTop: 6 }]}>Pedidos, comprobantes y disponibilidad.</Text>
      </View>

      <View style={[st.sync, sync !== 'live' && { borderColor: '#e2b66d', backgroundColor: '#fff1d8' }]}>
        <Text style={st.syncKey}>ESTADO DE SINCRONIZACIÓN</Text>
        <Text style={[st.syncVal, sync !== 'live' && { color: '#8b4c10' }]}>{sync === 'live' ? 'SINCRONIZACIÓN EN VIVO' : sync === 'connecting' ? 'CONECTANDO…' : 'RECONECTANDO'}</Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: '#285c32', marginTop: 4 }}>Los cambios de stock se guardan globalmente y se reflejan en todos los dispositivos.</Text>
      </View>

      {fresh.map(o => <Pressable key={o.id} onPress={() => { setFresh(list => list.filter(x => x.id !== o.id)); setSelected(o); }} style={({ pressed }) => [st.fresh, pressed && { transform: [{ scale: 0.99 }] }]}>
        <Ionicons name="notifications" size={20} color={colors.ink}/>
        <View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.bodyBold }}>Nuevo pedido #{o.order_number}</Text><Text style={{ fontFamily: fonts.body, fontSize: 12 }}>{o.customer?.name} · {money(o.total)}</Text></View>
        <Text style={{ fontFamily: fonts.button, fontSize: 11 }}>VER</Text>
      </Pressable>)}

      <Pressable onPress={() => { const next = !sound; setSound(next); if (next) { try { player.seekTo(0); player.play(); } catch {} } }} style={st.sound}>
        <Ionicons name={sound ? 'notifications-outline' : 'notifications-off-outline'} size={16} color={sound ? colors.ink : colors.muted}/>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: sound ? colors.ink : colors.muted }}>{sound ? 'Sonido de pedidos nuevos activado' : 'Sonido de pedidos nuevos apagado'}</Text>
      </Pressable>

      <View style={st.store}>
        <View style={{ flex: 1 }}>
          <Text style={st.storeKey}>ESTADO DE LA TIENDA</Text>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 17, color: colors.cream }}>{storeOpen ? 'Tienda activa' : 'Tienda cerrada'}</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.mutedLight }}>{storeOpen ? 'Los clientes pueden comprar' : 'Los pedidos están pausados'}</Text>
        </View>
        <Pressable onPress={toggleStore} accessibilityRole="switch" accessibilityState={{ checked: storeOpen }} style={({ pressed }) => [st.storeBtn, storeOpen && { backgroundColor: colors.pink, borderColor: colors.pink }, pressed && { transform: [{ scale: 0.97 }] }]}>
          <Ionicons name="power" size={18} color={storeOpen ? colors.ink : colors.mutedLight}/>
          <Text style={{ fontFamily: fonts.button, fontSize: 11, color: storeOpen ? colors.ink : colors.mutedLight }}>{storeOpen ? 'ACTIVA' : 'CERRADA'}</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {[['bag-outline', 'Pedidos totales', orders.length], ['clipboard-outline', 'Pendientes', pending], ['car-outline', 'Delivery activos', orders.filter(o => o.mode === 'delivery' && getOrderStage(o) < 3).length], ['cube-outline', 'Productos activos', products.filter(p => stock[p.id] !== false).length]].map(([icon, l, v]) =>
          <View key={l} style={[P.box, { width: '48.5%', padding: 16 }]}><Ionicons name={icon} size={20} color={colors.pinkDeep}/><Text style={[P.small, { marginTop: 14 }]}>{l}</Text><Text style={{ fontFamily: fonts.button, fontSize: 28 }}>{v}</Text></View>)}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {TABS.map(id => <View key={id}>
          <Pill title={labels[id]} active={tab === id} onPress={() => setTab(id)}/>
          {id === 'kitchen' && late && <View style={st.lateDot}/>}
        </View>)}
      </View>
      {!!error && <Notice tone="bad">{error}</Notice>}

      {tab === 'summary' && <Summary orders={orders} products={products} now={now}/>}
      {tab === 'orders' && <Orders orders={orders} now={now} onOpen={o => { setError(''); setSelected(o); }}/>}
      {tab === 'kitchen' && <Kitchen orders={orders} now={now} onAdvance={advance}/>}
      {tab === 'logistics' && <Logistics orders={orders}/>}
      {tab === 'receipts' && <Receipts orders={orders} onOpen={setSelected}/>}
      {tab === 'products' && <Availability token={token} products={products} stock={stock} onDone={refresh} onError={handleAuth}/>}
      {tab === 'coupons' && <Coupons token={token} products={products} onError={handleAuth}/>}
      {tab === 'zones' && <Zones token={token} onError={handleAuth}/>}
    </ScrollView>
    <OrderSheet order={selected} onClose={() => setSelected(null)} onAdvance={advance} onDelete={removeOrder}/>
  </View>;
}

function Orders({ orders, now, onOpen }) {
  const [query, setQuery] = useState(''), [status, setStatus] = useState('all'), [day, setDay] = useState('all');
  const dates = useMemo(() => [...new Set(orders.map(o => new Date(o.created_at || Date.now()).toISOString().slice(0, 10)))].sort().reverse().slice(0, 7), [orders]);
  const list = orders.filter(o => {
    const term = query.trim().toLowerCase(), hay = `${o.order_number || o.id} ${o.customer?.name || ''} ${o.customer?.phone || ''}`.toLowerCase();
    return (status === 'all' || String(getOrderStage(o)) === status) && (day === 'all' || new Date(o.created_at || Date.now()).toISOString().slice(0, 10) === day) && (!term || hay.includes(term));
  });
  return <View style={{ gap: 10 }}>
    <Text style={P.title}>Pedidos</Text>
    <View style={st.search}><Ionicons name="search" size={16} color={colors.muted}/><TextInput value={query} onChangeText={setQuery} placeholder="Nombre, teléfono o pedido" placeholderTextColor={colors.mutedLight} style={{ flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.ink, minHeight: 44 }}/></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
      <Pill title="Todos los estados" active={status === 'all'} onPress={() => setStatus('all')}/>
      {ORDER_STAGES.map(s => <Pill key={s.stage} title={s.status} active={status === String(s.stage)} onPress={() => setStatus(String(s.stage))}/>)}
    </ScrollView>
    {dates.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
      <Pill title="Todos los días" active={day === 'all'} onPress={() => setDay('all')}/>
      {dates.map(d => <Pill key={d} title={d} active={day === d} onPress={() => setDay(d)}/>)}
    </ScrollView>}
    {!list.length ? <View style={{ alignItems: 'center', paddingVertical: 48, gap: 10 }}><Ionicons name="clipboard-outline" size={34} color={colors.pinkDeep}/><Text style={{ fontFamily: fonts.bodyBold, fontSize: 16 }}>No hay pedidos con estos filtros</Text></View>
      : <View>{list.slice(0, 120).map(o => <Pressable key={o.id} onPress={() => onOpen(o)} style={({ pressed }) => [st.row, pressed && { backgroundColor: colors.bone }]}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={P.small}>#{o.order_number || o.id}</Text>
          <Text style={{ fontFamily: fonts.button, fontSize: 16 }}>{o.customer?.name || 'Cliente'}</Text>
          <Text style={P.small}>{o.items?.length || 0} productos · {o.mode === 'delivery' ? 'Delivery' : 'Retiro'}{(o.receipt_name || o.receipt_path) ? <Text style={{ color: colors.pinkDeep }}> · Comprobante</Text> : ''}</Text>
          {getOrderStage(o) < 2 && <Text style={[P.small, isLate(o, now) && { color: colors.late, fontFamily: fonts.bodyBold }]}>Esperando hace {minutesSince(o, now)} min{isLate(o, now) ? ' · ATRASADO' : ''}</Text>}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}><Text style={{ fontFamily: fonts.bodyBold }}>{money(o.total)}</Text><Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.pinkDeep }}>{o.status}</Text></View>
      </Pressable>)}</View>}
  </View>;
}

function OrderSheet({ order, onClose, onAdvance, onDelete }) {
  const insets = useSafeAreaInsets();
  const { zones } = useApp();
  const [receipt, setReceipt] = useState(null), [busy, setBusy] = useState(false);
  useEffect(() => { setReceipt(null); if (order?.receipt_path) adminReceiptUrl(order.receipt_path).then(setReceipt).catch(() => {}); }, [order?.id, order?.receipt_path]);
  if (!order) return null;
  const stage = getOrderStage(order), isDelivery = order.mode === 'delivery', phone = order.customer?.phone;
  const map = isDelivery ? deliveryMapsUrl(order.address) : null, zone = isDelivery ? getDeliveryZoneFromAddress(order.address, zones) : null;
  const del = () => {
    const go = async () => { setBusy(true); await onDelete(order); setBusy(false); };
    if (Platform.OS === 'web') { if (globalThis.confirm?.('¿Eliminar este pedido y su comprobante?')) go(); }
    else Alert.alert('¿Eliminar este pedido?', 'También se borra su comprobante.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: go }]);
  };
  return <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
    <ScrollView style={{ backgroundColor: colors.white }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, gap: 12, paddingBottom: insets.bottom + 30 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={st.kicker}>PEDIDO #{order.order_number || order.id}</Text>
        <Pressable onPress={onClose} accessibilityLabel="Cerrar" hitSlop={10} style={st.close}><Ionicons name="close" size={20} color={colors.ink}/></Pressable>
      </View>
      <Text style={{ fontFamily: fonts.button, fontSize: 32, textTransform: 'uppercase' }}>{order.customer?.name || 'Cliente'}</Text>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.6, color: colors.muted }}>{isDelivery ? `DELIVERY · ${displayDeliveryAddress(order.address)}` : 'RETIRO EN EL CARRITO · RÍO LOA 130'}</Text>
      {isDelivery && <DeliveryMap readOnly zones={zones} point={parsePointFromAddress(order.address)} activeZoneId={zone?.id || null} style={st.map}/>}
      {map && <Pressable onPress={() => Linking.openURL(map)} style={st.link}><Ionicons name="location-outline" size={18} color={colors.ink}/><Text style={st.linkText}>ABRIR UBICACIÓN EN MAPS</Text></Pressable>}
      {phone && <Pressable onPress={() => Linking.openURL(`tel:${phone}`)} style={st.link}><Ionicons name="call-outline" size={18} color={colors.ink}/><Text style={st.linkText}>LLAMAR AL {phone}</Text></Pressable>}
      {phone && <Pressable onPress={() => Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}`)} style={st.link}><Ionicons name="logo-whatsapp" size={18} color={colors.ink}/><Text style={st.linkText}>ESCRIBIR POR WHATSAPP</Text></Pressable>}
      <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: 10, gap: 10 }}>
        {order.items.map((it, i) => <View key={i} style={{ gap: 2 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}><Text style={{ flex: 1, fontFamily: fonts.body }}>{it.quantity} × {it.product?.name || it.name}{it.variant ? ` (${it.variant})` : ''}</Text><Text style={{ fontFamily: fonts.bodyBold }}>{money(it.price * it.quantity)}</Text></View>
          {it.burger_choices?.length > 0 && <Text style={P.small}><Text style={{ fontFamily: fonts.bodyBold }}>Hamburguesas:</Text> {it.burger_choices.join(', ')}</Text>}
          {(it.selections || []).map((s, k) => <Text key={k} style={P.small}><Text style={{ fontFamily: fonts.bodyBold }}>{s.label}:</Text> {s.value}</Text>)}
          {!!it.note && <Text style={[P.small, { color: colors.warn }]}><Text style={{ fontFamily: fonts.bodyBold }}>Instrucción:</Text> {it.note}</Text>}
        </View>)}
        {zone && <View style={{ flexDirection: 'row' }}><Text style={{ flex: 1, fontFamily: fonts.body }}>Despacho · {zone.label}</Text><Text style={{ fontFamily: fonts.bodyBold }}>{money(zone.fee)}</Text></View>}
      </View>
      {!!order.coupon_code && <Text style={{ fontFamily: fonts.body, color: colors.good }}>Cupón {order.coupon_code}: −{money(order.discount_amount)}</Text>}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', borderTopWidth: 1, borderTopColor: colors.ink, paddingTop: 10 }}><Text style={{ fontFamily: fonts.body, fontSize: 16 }}>Total</Text><Text style={{ fontFamily: fonts.button, fontSize: 26 }}>{money(order.total)}</Text></View>
      <View style={st.statusNow}><Ionicons name="checkmark" size={16} color={colors.good}/><Text style={{ fontFamily: fonts.bodyBold, color: colors.good }}>{order.status}</Text></View>
      <Text style={[st.kicker, { color: colors.muted }]}>ACTUALIZAR ESTADO</Text>
      <View style={{ gap: 8 }}>{ORDER_STAGES.slice(1).map(s => <Pill key={s.stage} title={s.status} active={stage === s.stage} onPress={() => onAdvance(order, s)}/>)}</View>
      {order.receipt_path && <View style={{ gap: 8, marginTop: 6 }}><Text style={[st.kicker, { color: colors.muted }]}>COMPROBANTE</Text>{receipt ? <Image source={{ uri: receipt }} style={{ width: '100%', aspectRatio: 0.7, backgroundColor: colors.bone }} contentFit="contain"/> : <ActivityIndicator color={colors.pinkDeep}/>}</View>}
      <Pressable onPress={del} disabled={busy} style={({ pressed }) => [st.delete, pressed && { opacity: 0.85 }]}><Text style={{ fontFamily: fonts.button, color: colors.white, letterSpacing: 1 }}>{busy ? 'PROCESANDO…' : 'ELIMINAR PEDIDO'}</Text></Pressable>
    </ScrollView>
  </Modal>;
}

const st = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: colors.ink },
  brand: { fontFamily: fonts.button, color: colors.cream, fontSize: 12, letterSpacing: 1.4 },
  topBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 8 },
  topBtnText: { fontFamily: fonts.body, color: colors.cream, fontSize: 15 },
  kicker: { fontFamily: fonts.button, fontSize: 11, letterSpacing: 1.6, color: colors.pinkDeep },
  h1: { fontFamily: fonts.button, fontSize: 58, lineHeight: 52, letterSpacing: -3.5, color: colors.ink, marginTop: 8, paddingTop: 6 },
  sync: { borderWidth: 1, borderColor: '#9fc5a5', backgroundColor: '#e3f3e5', padding: 14 },
  syncKey: { fontFamily: fonts.button, fontSize: 10, letterSpacing: 1.2, color: colors.muted },
  syncVal: { fontFamily: fonts.button, fontSize: 12, color: '#176128', marginTop: 2 },
  fresh: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.pink, padding: 14 },
  sound: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', minHeight: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  store: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.ink, padding: 16 },
  storeKey: { fontFamily: fonts.button, fontSize: 11, letterSpacing: 1.4, color: colors.pink, marginBottom: 2 },
  storeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 46, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: colors.cardLine },
  lateDot: { position: 'absolute', top: 4, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.late },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  row: { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: colors.white, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, marginBottom: -StyleSheet.hairlineWidth },
  or: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
  map: { width: '100%', height: 240, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.line },
  close: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 46, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.ink, borderRadius: 999, alignSelf: 'flex-start' },
  linkText: { fontFamily: fonts.button, fontSize: 11, letterSpacing: 0.8, color: colors.ink },
  statusNow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.goodBg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  delete: { marginTop: 10, minHeight: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.late, borderRadius: 999 },
});

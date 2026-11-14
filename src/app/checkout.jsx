import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Chip, Display, Eyebrow, Field, Notice } from '../components/ui';
import DeliveryMap from '../components/DeliveryMap';
import { useApp } from '../lib/store';
import { findCoupon, placeOrder } from '../lib/api';
import { business, colors, money } from '../lib/theme';
import { composeDeliveryAddress, DELIVERY_UNAVAILABLE_MESSAGE, formatDeliveryAddress, getDeliveryFee } from '../shared/delivery.js';
import { lookupDeliveryAddress, reverseGeocode } from '../shared/addressLookup.js';
import { zoneForPoint } from '../shared/geo.js';
import { couponDiscount, couponError } from '../shared/couponRules.js';

const newOrderNumber = () => `SHET-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

export default function Checkout() {
  const insets = useSafeAreaInsets();
  const { cart, cartSubtotal: subtotal, zones, storeOpen, profile, setProfile, clearCart, rememberOrder } = useApp();
  const [mode, setMode] = useState('delivery');
  const [name, setName] = useState(profile.name || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [detail, setDetail] = useState('');
  const [place, setPlace] = useState(null); // { zone, point, precise }
  const [lookup, setLookup] = useState({ status: 'idle', message: '' });
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [couponMsg, setCouponMsg] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const lookupId = useRef(0), keepPlace = useRef(false);

  const zone = mode === 'delivery' ? place?.zone : null;
  const fee = getDeliveryFee(mode, zone?.id, zones);
  const context = { items: cart, mode, deliveryFee: fee };
  const discount = couponDiscount(coupon, subtotal, Date.now(), context);
  const ready = mode === 'pickup' || Boolean(zone);
  const total = subtotal + fee - discount;

  // Al cambiar la dirección se invalida el despacho calculado.
  useEffect(() => {
    if (keepPlace.current) { keepPlace.current = false; return; }
    // Número escrito después de marcar la casa en el mapa: se mantiene ese pin y su zona.
    if (place?.fromMap && place.street === street) return;
    setPlace(null); setLookup({ status: 'idle', message: '' });
  }, [street, number]);

  const calculate = async () => {
    const address = composeDeliveryAddress({ street, number });
    const id = ++lookupId.current;
    setLookup({ status: 'loading', message: 'Buscando tu dirección…' });
    try {
      const found = await lookupDeliveryAddress(address, { zones });
      if (id !== lookupId.current) return;
      setPlace(found);
      setLookup({ status: 'ready', message: found.precise ? `Encontramos tu casa en ${found.zone.label}.` : `Calculamos el despacho para ${found.zone.label} según tu calle.` });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      if (id !== lookupId.current) return;
      setLookup({ status: 'error', message: e.message || 'No encontramos esa dirección.' });
    }
  };

  // Punto elegido en el mapa o por GPS: zona según el polígono y calle/número por geocodificación inversa (igual que la web).
  const placePoint = async (point, id) => {
    const found = zoneForPoint(point, zones);
    if (!found) { setPlace(null); throw new Error(DELIVERY_UNAVAILABLE_MESSAGE); }
    setPlace({ zone: found, point, precise: true, street, fromMap: true });
    setLookup({ status: 'ready', message: `Ubicación lista: ${found.label}.` });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const addr = await reverseGeocode(point).catch(() => null);
    if (id !== lookupId.current) return;
    const nextStreet = addr?.street || street, nextNumber = addr?.number ? String(addr.number) : number;
    // Rellenar la calle no debe borrar el punto recién marcado.
    if (nextStreet !== street || nextNumber !== number) keepPlace.current = true;
    setStreet(nextStreet); setNumber(nextNumber);
    setPlace({ zone: found, point, precise: true, street: nextStreet, fromMap: true });
    setLookup({ status: 'ready', message: `Ubicación lista: ${found.label}.${nextNumber ? '' : ' Escribe el número de tu casa.'}` });
  };
  const pickOnMap = point => {
    const id = ++lookupId.current;
    placePoint(point, id).catch(e => { if (id === lookupId.current) setLookup({ status: 'error', message: e.message }); });
  };
  const useMyLocation = async () => {
    const id = ++lookupId.current;
    setLookup({ status: 'loading', message: 'Obteniendo tu ubicación…' });
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') throw new Error('Activa el permiso de ubicación o toca tu casa en el mapa.');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await placePoint([pos.coords.latitude, pos.coords.longitude], id);
    } catch (e) {
      if (id === lookupId.current) setLookup({ status: 'error', message: e.message || 'No pudimos obtener tu ubicación. Toca tu casa en el mapa.' });
    }
  };

  const applyCoupon = async () => {
    setCouponMsg('');
    try {
      const r = await findCoupon(couponCode);
      if (r.error) throw r.error;
      const issue = couponError(r.data, subtotal, Date.now(), context);
      if (issue) throw new Error(issue);
      setCoupon(r.data); setCouponCode(r.data.code);
    } catch (e) { setCoupon(null); setCouponMsg(e.message || 'No se pudo validar el cupón.'); }
  };

  const pickReceipt = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled) { const a = result.assets[0]; setReceipt({ uri: a.uri, name: a.fileName || `comprobante-${Date.now()}.jpg`, mimeType: a.mimeType || 'image/jpeg' }); }
  };

  const copyAccount = async () => {
    await Clipboard.setStringAsync(`${business.name}\n${business.rut}\n${business.bank}\n${business.account}`);
    setCopied(true); Haptics.selectionAsync().catch(() => {});
    setTimeout(() => setCopied(false), 2000);
  };

  const submit = async () => {
    setError('');
    if (!storeOpen) return setError('La tienda está cerrada y no está recibiendo pedidos.');
    if (name.trim().length < 2) return setError('Escribe tu nombre.');
    if (!/^\d{8}$/.test(phone)) return setError('Escribe tu celular: 8 dígitos después de +569.');
    if (mode === 'delivery' && !zone) return setError('Calcula el despacho con tu dirección antes de enviar.');
    if (mode === 'delivery' && !number.trim()) return setError('Falta el número de tu casa.');
    setSaving(true);
    try {
      if (coupon) {
        // Se vuelve a consultar el cupón: pudo pausarse o cambiar mientras el cliente elegía.
        const fresh = await findCoupon(coupon.code);
        const issue = fresh.error?.message || couponError(fresh.data, subtotal, Date.now(), context);
        if (issue) throw new Error(issue);
      }
      const streetLine = [composeDeliveryAddress({ street, number }), detail.trim()].filter(Boolean).join(', ');
      const address = mode === 'delivery' ? formatDeliveryAddress(zone.id, streetLine, zones, place.point) : '';
      if (address.length > 180) throw new Error('La dirección es demasiado larga. Abrevia el detalle.');
      const order = {
        order_number: newOrderNumber(),
        items: cart.map(i => ({ product: i.product, quantity: i.quantity, price: i.variant.price, variant: i.variant.label, note: i.customization?.note || '', burger_choices: i.customization?.burgerChoices || [], customization: i.customization || {}, selections: i.customization?.selections || [] })),
        coupon_code: coupon?.code || null, fulfillment: mode, customer_name: name.trim(), customer_phone: `+569${phone}`, address,
        receipt_name: receipt?.name || '',
      };
      const saved = await placeOrder(order, receipt);
      setProfile({ name: name.trim(), phone });
      rememberOrder(saved);
      clearCart();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.dismissAll();
      router.push(`/pedido/${saved.order_number}?nuevo=1`);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setError(e.message || 'No se pudo enviar el pedido. Intenta nuevamente.');
    } finally { setSaving(false); }
  };

  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 30 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[['delivery', 'A domicilio', 'Según tu zona'], ['pickup', 'Retiro', 'Río Loa 130 · gratis']].map(([id, title, sub]) =>
          <Pressable key={id} onPress={() => { Haptics.selectionAsync().catch(() => {}); setMode(id); }} accessibilityRole="radio" accessibilityState={{ selected: mode === id }} style={[st.mode, mode === id && st.modeOn]}>
            <Text style={[st.modeTitle, mode === id && { color: colors.ink }]}>{title}</Text>
            <Text style={st.modeSub}>{sub}</Text>
          </Pressable>)}
      </View>

      <Card style={{ gap: 14 }}>
        <Eyebrow>Tus datos</Eyebrow>
        <Field label="Nombre" value={name} onChangeText={setName} autoComplete="name" textContentType="name" maxLength={80} placeholder="¿A nombre de quién?"/>
        <Field label="Celular" prefix="+569" value={phone} onChangeText={t => setPhone(t.replace(/\D/g, '').slice(0, 8))} keyboardType="number-pad" textContentType="telephoneNumber" placeholder="12345678" maxLength={8}/>
      </Card>

      {mode === 'delivery' ? <Card style={{ gap: 14 }}>
        <Eyebrow>¿Dónde lo llevamos?</Eyebrow>
        <Button variant="outline" title="Usar mi ubicación" onPress={useMyLocation} disabled={lookup.status === 'loading'}/>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Field style={{ flex: 1 }} label="Calle" value={street} onChangeText={setStreet} placeholder="Ej.: Río Itata" textContentType="streetAddressLine1"/>
          <Field style={{ width: 96 }} label="Número" value={number} onChangeText={setNumber} placeholder="50" keyboardType="number-pad"/>
        </View>
        <DeliveryMap zones={zones} point={place?.point || null} activeZoneId={zone?.id || null} onPick={pickOnMap} style={st.map}/>
        <Text style={{ fontSize: 12, color: colors.muted }}>Toca tu casa en el mapa o arrastra el pin. Los colores son las zonas de reparto.</Text>
        <Field label="Depto / detalle (opcional)" value={detail} onChangeText={setDetail} placeholder="Ej.: casa verde, depto 302" maxLength={60}/>
        {lookup.status !== 'ready' && <Button title={lookup.status === 'loading' ? 'Buscando…' : 'Calcular despacho'} onPress={calculate} disabled={lookup.status === 'loading' || !street.trim() || !number.trim()}/>}
        {lookup.status === 'loading' && <ActivityIndicator color={colors.pinkDeep}/>}
        {!!lookup.message && lookup.status !== 'loading' && <Notice tone={lookup.status === 'ready' ? 'good' : 'bad'}>{lookup.message}</Notice>}
      </Card> : <Card style={{ gap: 6 }}><Eyebrow>Retiro en el carrito SHET</Eyebrow><Text style={{ fontSize: 15, fontWeight: '700' }}>{business.pickupAddress}</Text><Text style={{ color: colors.muted }}>Te avisamos en el seguimiento cuando esté listo.</Text></Card>}

      <Card style={{ gap: 10 }}>
        <Eyebrow>¿Tienes un cupón?</Eyebrow>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
          <Field style={{ flex: 1 }} value={couponCode} onChangeText={t => { setCouponCode(t.toUpperCase()); if (coupon) setCoupon(null); }} placeholder="SHET10" autoCapitalize="characters" autoCorrect={false}/>
          <Button title="Aplicar" variant="outline" onPress={applyCoupon} disabled={!couponCode.trim()} style={{ minHeight: 52 }}/>
        </View>
        {coupon && <Notice tone="good">Cupón {coupon.code} aplicado: −{money(discount)}</Notice>}
        {!!couponMsg && <Notice tone="bad">{couponMsg}</Notice>}
      </Card>

      <Card style={{ gap: 10 }}>
        <Eyebrow>Pago por transferencia</Eyebrow>
        <Text style={st.bank}>{business.name}{'\n'}{business.rut}{'\n'}{business.bank}{'\n'}{business.account}</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Chip label={copied ? 'Copiado ✓' : 'Copiar datos'} onPress={copyAccount}/>
          <Chip label={receipt ? 'Cambiar comprobante' : 'Adjuntar comprobante'} onPress={pickReceipt}/>
        </View>
        {receipt && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Image source={{ uri: receipt.uri }} style={{ width: 54, height: 54, borderRadius: 8 }}/><Text style={{ flex: 1, color: colors.muted }} numberOfLines={1}>{receipt.name}</Text><Chip label="Quitar" onPress={() => setReceipt(null)}/></View>}
        <Text style={{ fontSize: 12, color: colors.muted }}>Puedes adjuntar el comprobante ahora o enviarlo después por WhatsApp.</Text>
      </Card>

      <Card style={{ gap: 8 }}>
        <Line label="Productos" value={money(subtotal)}/>
        <Line label={mode === 'pickup' ? 'Retiro' : `Despacho${zone ? ` · ${zone.label}` : ''}`} value={mode === 'pickup' ? 'Sin costo' : zone ? money(fee) : 'Por calcular'}/>
        {discount > 0 && <Line label={`Cupón ${coupon.code}`} value={`−${money(discount)}`} color={colors.good}/>}
        <View style={st.totalRow}><Text style={{ fontSize: 16 }}>Total</Text><Display size={28}>{ready ? money(total) : 'Por calcular'}</Display></View>
      </Card>

      {!!error && <Notice tone="bad">{error}</Notice>}
      <Button title={saving ? 'Enviando…' : `Enviar pedido${ready ? ` · ${money(total)}` : ''}`} onPress={submit} disabled={saving || !ready || !cart.length}/>
      <View style={{ height: insets.bottom }}/>
    </ScrollView>
  </KeyboardAvoidingView>;
}

const Line = ({ label, value, color = colors.ink }) => <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Text style={{ color: colors.muted, flex: 1 }}>{label}</Text><Text style={{ fontWeight: '700', color }}>{value}</Text></View>;

const st = StyleSheet.create({
  mode: { flex: 1, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, gap: 4 },
  modeOn: { backgroundColor: colors.pink, borderColor: colors.ink },
  modeTitle: { fontWeight: '800', fontSize: 14, textTransform: 'uppercase', color: colors.ink },
  modeSub: { fontSize: 12, color: colors.muted },
  map: { width: '100%', height: 300, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.line },
  bank: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: 10, marginTop: 4 },
});

import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Button, Card, Display, Eyebrow, Notice } from '../../components/ui';
import { loadPublicOrder, subscribe } from '../../lib/api';
import { business, colors, money } from '../../lib/theme';
import { ORDER_STAGES, getOrderStage } from '../../shared/orderStatus.js';
import { displayDeliveryAddress } from '../../shared/delivery.js';

// Igual que el seguimiento web: el título sigue al estado actual.
const titles = ['está recibido.', 'está en preparación.', 'está listo para servir.', 'fue entregado.'];

export default function Tracker() {
  const { numero, nuevo } = useLocalSearchParams();
  const [order, setOrder] = useState(null);
  const [state, setState] = useState('loading');
  const [refreshing, setRefreshing] = useState(false);
  const lastStage = useRef(null);

  const load = useCallback(async () => {
    try {
      const found = await loadPublicOrder(numero);
      setOrder(found); setState(found ? 'ready' : 'missing');
      const stage = found ? getOrderStage(found) : null;
      // Vibra cuando el local cambia el estado mientras el cliente mira la pantalla.
      if (lastStage.current !== null && stage !== null && stage !== lastStage.current) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      lastStage.current = stage;
    } catch { setState(s => (s === 'ready' ? 'ready' : 'error')); }
  }, [numero]);

  useEffect(() => {
    load();
    const off = subscribe('orders', payload => { if ((payload.new?.order_number || payload.old?.order_number) === numero) load(); });
    const timer = setInterval(load, 30000); // respaldo si el tiempo real se corta
    return () => { off(); clearInterval(timer); };
  }, [load, numero]);

  if (state === 'loading') return <View style={st.center}><ActivityIndicator color={colors.pinkDeep}/></View>;
  if (!order) return <View style={[st.center, { padding: 24, gap: 12 }]}><Display size={28} style={{ textAlign: 'center' }}>No encontramos el pedido</Display><Text style={{ color: colors.muted, textAlign: 'center' }}>#{numero}{state === 'error' ? ' · revisa tu conexión' : ''}</Text><Button title="Reintentar" variant="outline" onPress={load}/></View>;

  const stage = getOrderStage(order), isDelivery = order.mode === 'delivery';
  const fee = isDelivery ? Number(order.total) + Number(order.discount_amount || 0) - order.items.reduce((s, i) => s + i.price * i.quantity, 0) : 0;
  return <ScrollView style={{ backgroundColor: colors.paper }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.pinkDeep}/>}>
    {nuevo === '1' && <Notice tone="good">¡Pedido enviado! Te mostramos aquí cada cambio de estado.</Notice>}
    <View style={{ gap: 4 }}>
      <Eyebrow>Seguimiento · #{order.order_number}</Eyebrow>
      <Display size={40}>Tu pedido{'\n'}<Text style={{ color: colors.pinkDeep }}>{titles[stage] || titles[0]}</Text></Display>
    </View>

    <Card style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={st.small}>ESTADO ACTUAL</Text><Text style={{ color: colors.pinkDeep, fontWeight: '800', fontSize: 13 }}>{order.status}</Text></View>
      <View style={{ flexDirection: 'row' }}>
        {ORDER_STAGES.map((s, i) => <View key={s.stage} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
          {i < ORDER_STAGES.length - 1 && <View style={[st.bar, i < stage && { backgroundColor: colors.pinkDeep }]}/>}
          <View style={[st.dot, i <= stage && st.dotDone, i === stage && st.dotNow]}><Text style={{ fontSize: 12, fontWeight: '800', color: i <= stage ? colors.ink : colors.mutedLight }}>{i < stage ? '✓' : i + 1}</Text></View>
          <Text style={[st.stageLabel, i <= stage && { color: colors.ink }]}>{s.status}</Text>
        </View>)}
      </View>
    </Card>

    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Display size={20}>Recibo</Display><Text style={st.small}>{isDelivery ? 'A DOMICILIO' : 'RETIRO'}</Text></View>
      {order.items.map((it, i) => <View key={i} style={{ gap: 2 }}>
        <View style={st.line}><Text style={{ flex: 1 }}>{it.quantity} × {it.product?.name || it.name}{it.variant ? ` (${it.variant})` : ''}</Text><Text style={{ fontWeight: '700' }}>{money(it.price * it.quantity)}</Text></View>
        {(it.selections || []).filter(sel => sel.label !== 'Entrega').map((sel, k) => <Text key={k} style={st.small}>{sel.label}: {sel.value}</Text>)}
        {!!it.note && <Text style={[st.small, { color: colors.warn }]}>Nota: {it.note}</Text>}
      </View>)}
      {isDelivery && fee > 0 && <View style={st.line}><Text style={{ flex: 1, color: colors.muted }}>Despacho</Text><Text>{money(fee)}</Text></View>}
      {!!order.coupon_code && <View style={st.line}><Text style={{ flex: 1, color: colors.good }}>Cupón {order.coupon_code}</Text><Text style={{ color: colors.good }}>−{money(order.discount_amount)}</Text></View>}
      <View style={[st.line, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: 10 }]}><Text style={{ flex: 1, fontSize: 16 }}>Total</Text><Display size={26}>{money(order.total)}</Display></View>
    </Card>

    <Card style={{ gap: 6 }}>
      <Eyebrow>{isDelivery ? 'Entrega a domicilio' : 'Retiro en el carrito SHET'}</Eyebrow>
      <Text style={{ fontSize: 15, fontWeight: '600' }}>{isDelivery ? displayDeliveryAddress(order.address) : business.pickupAddress}</Text>
      <Text style={st.small}>{order.customer?.name} · {order.customer?.phone}</Text>
      {!isDelivery && <Button small variant="outline" title="Cómo llegar" style={{ alignSelf: 'flex-start', marginTop: 6 }} onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(business.pickupAddress)}`)}/>}
    </Card>
  </ScrollView>;
}

const st = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
  small: { fontSize: 12, color: colors.muted },
  line: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  bar: { position: 'absolute', top: 15, left: '50%', width: '100%', height: 2, backgroundColor: '#d3cdd0' },
  dot: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#c8c1c4', backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: colors.pink, borderColor: colors.pink },
  dotNow: { borderWidth: 2, borderColor: colors.pinkDeep },
  stageLabel: { fontSize: 10.5, textAlign: 'center', color: colors.mutedLight, paddingHorizontal: 2 },
});

import { useEffect, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Display, Eyebrow, Notice, ProductPhoto } from '../../components/ui';
import { useApp } from '../../lib/store';
import { loadPublicCoupons } from '../../lib/api';
import { colors, money, business } from '../../lib/theme';
import { couponLabel } from '../../shared/couponRules.js';
import { priceValue } from '../../shared/customization.js';

export default function Home() {
  const insets = useSafeAreaInsets();
  const { products, stock, storeOpen, status, refresh, myOrders } = useApp();
  const [coupons, setCoupons] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => { loadPublicCoupons().then(r => setCoupons(r.data || [])).catch(() => {}); }, []);
  const featured = products.filter(p => p.category === 'burgers' && p.featured).concat(products.filter(p => p.category === 'promos')).slice(0, 6);
  const onRefresh = async () => { setRefreshing(true); await refresh(); const r = await loadPublicCoupons(); setCoupons(r.data || []); setRefreshing(false); };
  const lastOrder = myOrders[0];

  return <ScrollView style={{ backgroundColor: colors.paper }} contentContainerStyle={{ paddingBottom: 40 }} contentInsetAdjustmentBehavior="never"
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.pinkDeep}/>}>
    <View style={[st.hero, { paddingTop: insets.top + 18 }]}>
      <View style={st.brandRow}>
        <Image source={require('../../../assets/logo.png')} style={st.logo} contentFit="cover"/>
        <Text style={st.brand}>SHET BURGER</Text>
        <View style={[st.status, { backgroundColor: storeOpen ? colors.goodBg : colors.lateBg }]}>
          <View style={[st.dot, { backgroundColor: storeOpen ? colors.good : colors.late }]}/>
          <Text style={{ fontSize: 11, fontWeight: '800', color: storeOpen ? colors.good : colors.late }}>{storeOpen ? 'ABIERTO' : 'CERRADO'}</Text>
        </View>
      </View>
      <Display size={58} color={colors.cream} style={{ marginTop: 28 }}>Smash{'\n'}<Text style={{ color: colors.pink }}>de verdad.</Text></Display>
      <Text style={st.heroCopy}>Hamburguesas de Concepción, directo a tu casa o para retirar en Río Loa 130.</Text>
      <Button variant="pink" title={storeOpen ? 'Pedir ahora' : 'Ver el menú'} onPress={() => router.navigate('/menu')} style={{ marginTop: 22, alignSelf: 'flex-start' }}/>
    </View>

    <View style={{ padding: 16, gap: 16 }}>
      {!storeOpen && <Notice tone="bad">La tienda está cerrada por ahora. Puedes revisar el menú y pedir cuando volvamos a abrir.</Notice>}
      {status === 'error' && <Notice>No pudimos cargar el menú. Revisa tu conexión y desliza hacia abajo para reintentar.</Notice>}

      {lastOrder && <Pressable onPress={() => router.push(`/pedido/${lastOrder.order_number}`)} style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
        <Card style={{ backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}><Eyebrow color={colors.pink}>Tu último pedido</Eyebrow><Text style={{ color: colors.cream, fontWeight: '700', marginTop: 4 }}>#{lastOrder.order_number}</Text></View>
          <Text style={{ color: colors.pink, fontWeight: '800', fontSize: 12 }}>SEGUIR →</Text>
        </Card>
      </Pressable>}

      {coupons.length > 0 && <View style={{ gap: 10 }}>
        <Eyebrow>Promociones con código</Eyebrow>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {coupons.map(c => <View key={c.id} style={st.coupon}>
            <Text style={{ fontWeight: '800', fontSize: 15 }}>{c.title || c.code}</Text>
            <Text style={{ color: colors.ink, fontSize: 13 }}>{couponLabel(c)}</Text>
            <Text style={st.code}>{c.code}</Text>
          </View>)}
        </ScrollView>
      </View>}

      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Display size={28}>Las favoritas</Display>
        <Pressable onPress={() => router.navigate('/menu')} hitSlop={10}><Text style={{ color: colors.pinkDeep, fontWeight: '800', fontSize: 12 }}>VER TODO</Text></Pressable>
      </View>
      {featured.map(p => <Pressable key={p.id} onPress={() => router.push(`/producto/${p.id}`)} style={({ pressed }) => [st.feature, pressed && { transform: [{ scale: 0.98 }] }]}>
        <ProductPhoto product={p} style={st.featurePhoto}/>
        <View style={{ flex: 1, padding: 14, gap: 4 }}>
          <Text style={st.featureName}>{p.name}</Text>
          <Text numberOfLines={2} style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>{p.description}</Text>
          <Text style={{ fontWeight: '800', marginTop: 4 }}>{stock[p.id] === false ? 'AGOTADO' : `Desde ${money(priceValue(p.prices[0][1]))}`}</Text>
        </View>
      </Pressable>)}

      <Card style={{ gap: 6 }}>
        <Eyebrow>Retiro en el carrito</Eyebrow>
        <Text style={{ fontSize: 15, fontWeight: '700' }}>{business.pickupAddress}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <Button small variant="outline" title="Cómo llegar" onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(business.pickupAddress)}`)}/>
          <Button small variant="outline" title="Instagram" onPress={() => Linking.openURL(business.instagram)}/>
        </View>
      </Card>
    </View>
  </ScrollView>;
}

const st = StyleSheet.create({
  hero: { backgroundColor: colors.ink, paddingHorizontal: 20, paddingBottom: 30, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 40, height: 40, borderRadius: 20 },
  brand: { color: colors.cream, fontWeight: '800', letterSpacing: 2, fontSize: 12, flex: 1 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  heroCopy: { color: colors.mutedLight, fontSize: 15, lineHeight: 22, marginTop: 14, maxWidth: 320 },
  coupon: { width: 230, padding: 16, gap: 6, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.ink, backgroundColor: '#f6df32' },
  code: { alignSelf: 'flex-start', marginTop: 6, fontWeight: '900', letterSpacing: 1.5, backgroundColor: colors.ink, color: '#f6df32', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  feature: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: 18, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  featurePhoto: { width: 116, minHeight: 116 },
  featureName: { fontFamily: 'Anton', fontSize: 20, textTransform: 'uppercase' },
});

import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Chip, Display, Notice, ProductPhoto, Stepper } from '../../components/ui';
import { useApp } from '../../lib/store';
import { colors, fonts, money } from '../../lib/theme';
import { customizationUnavailable, priceValue, standaloneExtra } from '../../shared/customization.js';

// Carrito con el mismo encabezado que el cajón de la web ("SHET BURGER / TU PEDIDO")
// y la fila "¿Algo más?" de fritos, bebidas y extras.
const UPSELL = [['fritos', 'Fritos'], ['bebidas', 'Bebidas'], ['extras', 'Extras']];

function Header({ count }) {
  const insets = useSafeAreaInsets();
  return <View style={[st.header, { paddingTop: insets.top + 14 }]}>
    <Text style={st.kicker}>SHET BURGER</Text>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
      <Display size={38}>Tu pedido</Display>
      {count > 0 && <Text style={st.count}>{count} {count === 1 ? 'producto' : 'productos'}</Text>}
    </View>
  </View>;
}

export default function Cart() {
  const { cart, setQuantity, clearCart, cartSubtotal, cartCount, stock, products, storeOpen } = useApp();
  const [upsell, setUpsell] = useState('fritos');
  const unavailable = cart.filter(i => stock[i.product.id] === false || customizationUnavailable(i.customization, stock, products));
  const suggestions = useMemo(() => products.filter(p => p.category === upsell && stock[p.id] !== false && (upsell !== 'extras' || standaloneExtra(p))).slice(0, 8), [products, stock, upsell]);

  const confirmClear = () => {
    if (Platform.OS === 'web') { if (globalThis.confirm?.('¿Vaciar el carrito?')) clearCart(); return; }
    Alert.alert('¿Vaciar el carrito?', 'Se quitarán todos los productos.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Vaciar', style: 'destructive', onPress: clearCart }]);
  };

  if (!cart.length) return <View style={{ flex: 1, backgroundColor: colors.paper }}>
    <Header count={0}/>
    <View style={st.empty}>
      <View style={st.emptyIcon}><Ionicons name="bag-handle-outline" size={34} color={colors.pinkDeep}/></View>
      <Display size={30} style={{ textAlign: 'center' }}>Tu pedido está vacío</Display>
      <Text style={st.emptyText}>Elige tu hamburguesa favorita y la preparamos al momento.</Text>
      <Button title="Ver la carta" onPress={() => router.navigate('/pedir')}/>
    </View>
  </View>;

  return <View style={{ flex: 1, backgroundColor: colors.paper }}>
    <Header count={cartCount}/>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 12 }}>
      {cart.map(item => {
        const bad = unavailable.includes(item);
        return <View key={item.key} style={[st.item, bad && { borderColor: colors.late, backgroundColor: colors.lateBg }]}>
          <ProductPhoto product={item.product} style={st.photo} contentFit={item.product.category === 'bebidas' ? 'contain' : 'cover'}/>
          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <Text style={[st.name, { flex: 1 }]}>{item.product.name}</Text>
              <Pressable onPress={() => setQuantity(item.key, 0)} hitSlop={10} accessibilityLabel={`Quitar ${item.product.name}`}><Ionicons name="trash-outline" size={19} color={colors.pinkDeep}/></Pressable>
            </View>
            <Text style={st.meta}>{item.variant.label}</Text>
            {item.customization.selections?.filter(sel => sel.label !== 'Entrega').map((sel, i) => <Text key={i} style={st.meta}>{sel.label}: {sel.value}</Text>)}
            {!!item.customization.note && <Text style={[st.meta, { color: colors.warn }]}>Nota: {item.customization.note}</Text>}
            {bad && <Text style={st.bad}>AGOTADO · quítalo para continuar</Text>}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
              <Text style={st.price}>{money(item.variant.price * item.quantity)}</Text>
              <Stepper label={item.product.name} value={item.quantity} min={1} onChange={q => setQuantity(item.key, q)}/>
            </View>
          </View>
        </View>;
      })}

      {suggestions.length > 0 && <View style={{ gap: 10, marginTop: 8 }}>
        <Text style={st.kicker}>¿ALGO MÁS?</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>{UPSELL.map(([id, l]) => <Chip key={id} label={l} active={upsell === id} onPress={() => setUpsell(id)}/>)}</View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {suggestions.map(p => <Pressable key={p.id} onPress={() => router.push(`/producto/${p.id}`)} style={({ pressed }) => [st.upsell, pressed && { transform: [{ scale: 0.97 }] }]}>
            <ProductPhoto product={p} style={st.upsellPhoto} contentFit={p.category === 'bebidas' ? 'contain' : 'cover'}/>
            <Text style={st.upsellName} numberOfLines={1}>{p.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={st.upsellPrice}>{money(priceValue(p.prices[0][1]))}</Text>
              <View style={st.plus}><Text style={{ fontSize: 18, color: colors.ink, marginTop: -2 }}>+</Text></View>
            </View>
          </Pressable>)}
        </ScrollView>
      </View>}

      <Pressable onPress={confirmClear} hitSlop={8} style={{ alignSelf: 'center', paddingVertical: 10 }}><Text style={st.clear}>VACIAR CARRITO</Text></Pressable>
    </ScrollView>

    <View style={st.footer}>
      {!storeOpen && <Notice tone="bad">La tienda está cerrada y no está recibiendo pedidos.</Notice>}
      <View style={st.line}><Text style={st.lineLabel}>Productos</Text><Text style={st.lineValue}>{money(cartSubtotal)}</Text></View>
      <View style={st.line}><Text style={st.lineLabel}>Delivery</Text><Text style={st.lineValue}>Por calcular</Text></View>
      <View style={[st.line, st.totalLine]}><Text style={{ fontFamily: fonts.body, fontSize: 16, color: colors.ink }}>Total del pedido</Text><Display size={24}>Por calcular</Display></View>
      <Text style={st.hint}>El despacho se calcula con tu dirección en el siguiente paso.</Text>
      <Button title={!storeOpen ? 'Tienda cerrada' : unavailable.length ? 'Revisa productos agotados' : 'Continuar pedido →'} disabled={!storeOpen || unavailable.length > 0} onPress={() => router.push('/checkout')}/>
    </View>
  </View>;
}

const st = StyleSheet.create({
  header: { paddingHorizontal: 18, paddingBottom: 14, backgroundColor: colors.paper, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  kicker: { fontFamily: fonts.button, fontSize: 11, letterSpacing: 1.6, color: colors.pinkDeep },
  count: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.muted },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16 },
  emptyIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(169,69,117,0.1)', alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: fonts.body, color: colors.muted, textAlign: 'center', fontSize: 15, lineHeight: 22 },
  item: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 16, backgroundColor: colors.white, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  photo: { width: 84, height: 84, borderRadius: 12 },
  name: { fontFamily: fonts.display, fontSize: 19, textTransform: 'uppercase', color: colors.ink },
  meta: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted, lineHeight: 17 },
  bad: { fontFamily: fonts.button, color: colors.late, fontSize: 11 },
  price: { fontFamily: fonts.button, fontSize: 16, color: colors.ink },
  upsell: { width: 140, padding: 10, gap: 6, borderRadius: 14, backgroundColor: colors.white, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  upsellPhoto: { width: '100%', height: 90, borderRadius: 10 },
  upsellName: { fontFamily: fonts.display, fontSize: 15, textTransform: 'uppercase', color: colors.ink },
  upsellPrice: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink },
  plus: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.pink, alignItems: 'center', justifyContent: 'center' },
  clear: { fontFamily: fonts.button, fontSize: 12, letterSpacing: 1.2, color: colors.muted },
  footer: { padding: 16, gap: 6, backgroundColor: colors.bone, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  lineLabel: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  lineValue: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  totalLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: 8, marginTop: 2 },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginBottom: 6 },
});

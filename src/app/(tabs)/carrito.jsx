import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Display, Notice, ProductPhoto, Stepper } from '../../components/ui';
import { useApp } from '../../lib/store';
import { colors, money } from '../../lib/theme';
import { customizationUnavailable } from '../../shared/customization.js';

export default function Cart() {
  const insets = useSafeAreaInsets();
  const { cart, setQuantity, clearCart, cartSubtotal, stock, products, storeOpen } = useApp();
  const unavailable = cart.filter(i => stock[i.product.id] === false || customizationUnavailable(i.customization, stock, products));

  const confirmClear = () => {
    if (Platform.OS === 'web') { clearCart(); return; }
    Alert.alert('¿Vaciar el carrito?', 'Se quitarán todos los productos.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Vaciar', style: 'destructive', onPress: clearCart }]);
  };

  if (!cart.length) return <View style={[st.empty, { paddingTop: insets.top }]}>
    <Display size={40} style={{ textAlign: 'center' }}>Tu pedido{'\n'}está vacío</Display>
    <Text style={{ color: colors.muted, textAlign: 'center', fontSize: 15 }}>Elige tu hamburguesa favorita y la preparamos al momento.</Text>
    <Button title="Ver la carta" onPress={() => router.navigate('/pedir')}/>
  </View>;

  return <View style={{ flex: 1, backgroundColor: colors.paper }}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 24, gap: 12 }}>
      <Display size={40}>Tu pedido</Display>
      {cart.map(item => {
        const bad = unavailable.includes(item);
        return <Card key={item.key} style={[{ flexDirection: 'row', gap: 12, padding: 12 }, bad && { borderColor: colors.late, backgroundColor: colors.lateBg }]}>
          <ProductPhoto product={item.product} style={st.photo}/>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={st.name}>{item.product.name}</Text>
            <Text style={st.meta}>{item.variant.label}</Text>
            {item.customization.selections?.filter(sel => sel.label !== 'Entrega').map((sel, i) => <Text key={i} style={st.meta}>{sel.label}: {sel.value}</Text>)}
            {!!item.customization.note && <Text style={[st.meta, { color: colors.warn }]}>Nota: {item.customization.note}</Text>}
            {bad && <Text style={{ color: colors.late, fontWeight: '700', fontSize: 12 }}>AGOTADO · quítalo para continuar</Text>}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
              <Text style={{ fontWeight: '800', fontSize: 16 }}>{money(item.variant.price * item.quantity)}</Text>
              <Stepper label={item.product.name} value={item.quantity} min={0} onChange={q => setQuantity(item.key, q)}/>
            </View>
          </View>
        </Card>;
      })}
      <Button variant="ghost" title="Vaciar carrito" onPress={confirmClear} small/>
    </ScrollView>
    <View style={st.footer}>
      {!storeOpen && <Notice tone="bad">La tienda está cerrada y no está recibiendo pedidos.</Notice>}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={{ fontSize: 15, color: colors.muted }}>Productos</Text>
        <Text style={{ fontFamily: 'Anton', fontSize: 26 }}>{money(cartSubtotal)}</Text>
      </View>
      <Text style={{ fontSize: 12, color: colors.muted }}>El despacho se calcula con tu dirección en el siguiente paso.</Text>
      <Button title={!storeOpen ? 'Tienda cerrada' : unavailable.length ? 'Revisa productos agotados' : 'Continuar pedido'} disabled={!storeOpen || unavailable.length > 0} onPress={() => router.push('/checkout')}/>
    </View>
  </View>;
}

const st = StyleSheet.create({
  empty: { flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 18 },
  photo: { width: 78, height: 78, borderRadius: 12 },
  name: { fontFamily: 'Anton', fontSize: 18, textTransform: 'uppercase' },
  meta: { fontSize: 12.5, color: colors.muted, lineHeight: 17 },
  footer: { padding: 16, gap: 8, backgroundColor: colors.paper, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
});

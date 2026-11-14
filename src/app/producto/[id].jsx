import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Chip, Display, Eyebrow, Notice, ProductPhoto, Stepper } from '../../components/ui';
import { useApp } from '../../lib/store';
import { colors, money } from '../../lib/theme';
import { customizationLines, customizationTotal, customizationUnavailable, extraEnabled, FRIES_MAX_QUANTITY, priceValue, promotionBurgerAllowed, promotionExtraAllowed, selectedAddons } from '../../shared/customization.js';

// Misma lógica que ProductConfigurator.jsx de la web, con controles nativos.
const promoDrinkCounts = { 'triple-shet': 3, vicio: 1, tentacion: 2 };

function Extras({ title, scope, products, stock, allowedIds, quantities, onChange }) {
  const list = products.filter(p => extraEnabled(p, scope) && (!allowedIds?.length || allowedIds.includes(p.id)));
  if (!list.length) return null;
  return <View style={{ gap: 8 }}>
    <Text style={st.legend}>{title}</Text>
    {list.map(extra => {
      const soldOut = stock[extra.id] === false, q = quantities[extra.id] || 0;
      return <View key={extra.id} style={[st.extra, soldOut && { opacity: 0.45 }]}>
        <View style={{ flex: 1 }}><Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: colors.ink }}>{extra.name}</Text><Text style={{ fontFamily: 'DMSans_400Regular', color: colors.muted, fontSize: 13 }}>{soldOut ? 'Agotado' : `+${money(priceValue(extra.prices[0][1]))}`}</Text></View>
        <Stepper label={extra.name} value={q} max={soldOut ? 0 : scope === 'fries' ? FRIES_MAX_QUANTITY : 10} onChange={v => onChange({ ...quantities, [extra.id]: v })}/>
      </View>;
    })}
  </View>;
}

function Picker({ label, options, value, onChange }) {
  return <View style={{ gap: 8 }}>
    <Text style={st.sub}>{label}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map(o => <Chip key={o.id} label={o.name} active={value === o.id} onPress={() => onChange(o.id)}/>)}
    </View>
  </View>;
}

export default function Product() {
  const { id } = useLocalSearchParams();
  const { products } = useApp();
  const product = products.find(p => p.id === id);
  if (!product) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}><Text style={{ color: colors.muted }}>Cargando producto…</Text></View>;
  return <Configurator product={product}/>;
}

function Configurator({ product }) {
  const insets = useSafeAreaInsets();
  const { products, stock, storeOpen, addToCart } = useApp();
  const availableBurgers = useMemo(() => products.filter(i => i.category === 'burgers' && stock[i.id] !== false && (!product.allowedBurgerIds?.length || product.allowedBurgerIds.includes(i.id))), [products, stock, product]);
  const availableDrinks = useMemo(() => products.filter(i => i.category === 'bebidas' && !i.optionGroup && stock[i.id] !== false), [products, stock]);
  const drinkCount = product.drinkChoiceCount ?? promoDrinkCounts[product.id] ?? 0;
  const burgerCount = product.burgerChoiceCount || 0;

  const [variant, setVariant] = useState(product.prices[0]);
  const [option, setOption] = useState('');
  const [note, setNote] = useState('');
  const [extras, setExtras] = useState({});
  const [fries, setFries] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [details, setDetails] = useState(() => Array.from({ length: burgerCount }, () => ({ variant: '', extras: {}, fries: {} })));
  const [burgerChoices, setBurgerChoices] = useState(() => Array.from({ length: burgerCount }, (_, i) => availableBurgers.find(b => promotionBurgerAllowed(product, i, b))?.id || ''));
  const [drinkChoices, setDrinkChoices] = useState(() => Array.from({ length: drinkCount }, () => availableDrinks[0]?.id || ''));
  const [error, setError] = useState('');

  const updateDetail = (i, changes) => setDetails(list => list.map((d, j) => j === i ? { ...d, ...changes } : d));
  const burgers = burgerChoices.map((bid, i) => {
    const burger = products.find(p => p.id === bid), d = details[i];
    const variants = burger?.prices.filter((_, k) => (product.allowBurgerVariants !== false && product.promotionSlots?.[i]?.allowBurgerVariants !== false) || k === 0);
    const v = variants?.find(x => x[0] === d.variant) || variants?.[0];
    const allowed = products.filter(e => promotionExtraAllowed(product, i, burger, e));
    return { product_id: bid, name: burger?.name || '', variant: v?.[0] || '', variants: variants || [], base: burger, surcharge: v ? priceValue(v[1]) - priceValue(burger.prices[0][1]) : 0, extras: selectedAddons(d.extras, allowed, 'burger'), friesExtras: selectedAddons(d.fries, allowed, 'fries'), allowed };
  });
  const customization = { extras: selectedAddons(extras, products, 'burger'), friesExtras: selectedAddons(fries, products, 'fries'), burgers: burgers.map(({ variants, base, allowed, ...b }) => b), drinkChoiceIds: drinkChoices };
  const unavailable = customizationUnavailable(customization, stock, products) || burgerChoices.some((bid, i) => !availableBurgers.some(b => b.id === bid && promotionBurgerAllowed(product, i, b)));
  const soldOut = stock[product.id] === false;
  const blocked = !storeOpen || soldOut || unavailable || (burgerCount > 0 && !availableBurgers.length) || (drinkCount > 0 && !availableDrinks.length) || (product.optionGroup && !option);
  const total = priceValue(variant[1]) + customizationTotal(customization);

  const submit = () => {
    if (blocked) return;
    const selections = [
      ...(product.optionGroup && option ? [{ label: product.optionGroup.label, value: option }] : []),
      ...drinkChoices.map((did, i) => ({ label: drinkCount === 1 ? 'Bebida' : `Bebida ${i + 1}`, value: availableDrinks.find(d => d.id === did)?.name })).filter(x => x.value),
      ...customizationLines(customization),
    ];
    const problem = addToCart(product, variant, { ...customization, quantity, note: note.trim(), burgerChoices: burgerChoices.map(bid => availableBurgers.find(b => b.id === bid)?.name).filter(Boolean), burgerChoiceIds: burgerChoices.filter(Boolean), selections });
    if (problem) { setError(problem); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  };

  const label = !storeOpen ? 'Tienda cerrada' : soldOut ? 'Agotado' : product.optionGroup && !option ? `Elige ${product.optionGroup.label}` : 'Agregar al pedido';
  return <View style={{ flex: 1, backgroundColor: colors.paper }}>
    <ScrollView contentContainerStyle={{ paddingBottom: 130 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
      <View>
        <ProductPhoto product={product} style={st.photo} contentFit={product.category === 'bebidas' ? 'contain' : 'cover'}/>
        <Pressable onPress={() => router.back()} accessibilityLabel="Cerrar" hitSlop={10} style={({ pressed }) => [st.close, pressed && { transform: [{ scale: 0.94 }] }]}><Ionicons name="close" size={22} color={colors.cream}/></Pressable>
      </View>
      <View style={{ padding: 20, gap: 18 }}>
        <View style={{ gap: 6 }}>
          <Eyebrow>Arma tu pedido</Eyebrow>
          <Display size={36}>{product.name}</Display>
          {!!product.description && <Text style={{ fontFamily: 'DMSans_400Regular', color: colors.muted, fontSize: 15, lineHeight: 22 }}>{product.description}</Text>}
        </View>

        {product.prices.length > 1 && <View style={{ gap: 8 }}>
          <Text style={st.legend}>{product.category === 'burgers' ? 'Elige simple o doble' : 'Elige una opción'}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {product.prices.map(p => <Pressable key={p[0]} onPress={() => { Haptics.selectionAsync().catch(() => {}); setVariant(p); }} accessibilityRole="radio" accessibilityState={{ selected: variant[0] === p[0] }}
              style={[st.variant, variant[0] === p[0] && st.variantOn]}>
              <Text style={[st.variantName, variant[0] === p[0] && { color: colors.cream }]}>{p[0]}</Text>
              <Text style={[st.variantPrice, variant[0] === p[0] && { color: colors.pink }]}>{p[1]}</Text>
            </Pressable>)}
          </View>
        </View>}

        {product.optionGroup && <View style={{ gap: 8 }}>
          <Text style={st.legend}>{product.optionGroup.prompt}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{product.optionGroup.values.map(v => <Chip key={v} label={v} active={option === v} onPress={() => setOption(v)}/>)}</View>
        </View>}

        {product.category === 'burgers' && <>
          <Extras title="Mejora tus papas" scope="fries" products={products} stock={stock} allowedIds={product.allowedExtraIds} quantities={fries} onChange={setFries}/>
          <Extras title="Extras de tu hamburguesa" scope="burger" products={products} stock={stock} allowedIds={product.allowedExtraIds} quantities={extras} onChange={setExtras}/>
        </>}

        {burgerCount > 0 && <View style={{ gap: 14 }}>
          <Text style={st.legend}>Elige {burgerCount === 1 ? 'tu hamburguesa' : `tus ${burgerCount} hamburguesas`}</Text>
          {burgers.map((b, i) => <View key={i} style={st.slot}>
            <Text style={{ fontFamily: 'Anton', fontSize: 18, textTransform: 'uppercase' }}>Hamburguesa {i + 1}</Text>
            <Picker label="¿Cuál?" value={burgerChoices[i]} options={availableBurgers.filter(x => promotionBurgerAllowed(product, i, x))} onChange={v => { setBurgerChoices(list => list.map((x, j) => j === i ? v : x)); updateDetail(i, { variant: '' }); }}/>
            {b.base && b.variants.length > 1 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {b.variants.map(v => <Chip key={v[0]} label={`${v[0]} · ${v === b.base.prices[0] ? 'incluida' : `+${money(priceValue(v[1]) - priceValue(b.base.prices[0][1]))}`}`} active={b.variant === v[0]} onPress={() => updateDetail(i, { variant: v[0] })}/>)}
            </View>}
            {b.base && <>
              <Extras title="Mejora tus papas" scope="fries" products={b.allowed} stock={stock} allowedIds={b.base.allowedExtraIds} quantities={details[i].fries} onChange={q => updateDetail(i, { fries: q })}/>
              <Extras title="Extras" scope="burger" products={b.allowed} stock={stock} allowedIds={b.base.allowedExtraIds} quantities={details[i].extras} onChange={q => updateDetail(i, { extras: q })}/>
            </>}
          </View>)}
          {!availableBurgers.length && <Notice tone="bad">No hay hamburguesas disponibles para completar esta promoción.</Notice>}
        </View>}

        {drinkCount > 0 && <View style={{ gap: 12 }}>
          <Text style={st.legend}>Elige {drinkCount === 1 ? 'tu bebida' : `tus ${drinkCount} bebidas`}</Text>
          {drinkChoices.map((d, i) => <Picker key={i} label={`Bebida ${i + 1}`} value={d} options={availableDrinks} onChange={v => setDrinkChoices(list => list.map((x, j) => j === i ? v : x))}/>)}
          {!availableDrinks.length && <Notice tone="bad">No hay bebidas disponibles para completar esta promoción.</Notice>}
        </View>}

        {product.category === 'bebidas' && <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={st.legend}>Cantidad</Text><Stepper label={product.name} value={quantity} min={1} onChange={setQuantity}/></View>}

        <View style={{ gap: 8 }}>
          <Text style={st.legend}>Instrucciones especiales <Text style={{ color: colors.muted, fontWeight: '400', textTransform: 'none' }}>(opcional)</Text></Text>
          <TextInput value={note} onChangeText={setNote} maxLength={240} multiline placeholder="Ej: sin pepinillos, sin cebolla o salsa aparte" placeholderTextColor={colors.mutedLight} style={st.note}/>
        </View>

        {!storeOpen && <Notice tone="bad">La tienda está cerrada. Podrás pedir este producto cuando volvamos a abrir.</Notice>}
        {storeOpen && soldOut && <Notice tone="bad">Este producto está agotado por el momento.</Notice>}
        {unavailable && <Notice tone="bad">Una selección se agotó. Retira el adicional o elige otro producto.</Notice>}
        {!!error && <Notice tone="bad">{error}</Notice>}
      </View>
    </ScrollView>
    <View style={[st.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
      <Button title={label} disabled={blocked} onPress={submit} style={{ flex: 1 }} right={<Text style={{ color: colors.pink, fontWeight: '800', fontSize: 15 }}>{money(total * quantity)}</Text>}/>
    </View>
  </View>;
}

const st = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 1.25 },
  close: { position: 'absolute', top: 14, right: 14, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(9,9,11,0.7)', alignItems: 'center', justifyContent: 'center' },
  legend: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: colors.ink },
  sub: { fontSize: 13, fontWeight: '700', color: colors.muted },
  variant: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  variantOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  variantName: { fontFamily: 'DMSans_500Medium', fontSize: 16, color: colors.ink },
  variantPrice: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: colors.pinkDeep },
  extra: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: 14, padding: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  slot: { gap: 12, backgroundColor: colors.white, borderRadius: 18, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  note: { fontFamily: 'DMSans_400Regular', minHeight: 84, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, padding: 12, fontSize: 15, textAlignVertical: 'top', color: colors.ink },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: colors.paper, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, flexDirection: 'row' },
});

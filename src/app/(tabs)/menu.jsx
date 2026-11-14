import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip, Display, Notice, ProductPhoto } from '../../components/ui';
import { useApp } from '../../lib/store';
import { colors, money } from '../../lib/theme';
import { priceValue, standaloneExtra } from '../../shared/customization.js';

const CATEGORIES = [['promos', 'Promociones'], ['burgers', 'Hamburguesas'], ['fritos', 'Fritos'], ['bebidas', 'Bebidas'], ['salsas', 'Salsas'], ['extras', 'Extras']];

export default function Menu() {
  const insets = useSafeAreaInsets();
  const { products, stock, storeOpen, status } = useApp();
  const [active, setActive] = useState('promos');
  const listRef = useRef(null);
  const sections = useMemo(() => CATEGORIES.map(([id, title]) => ({
    id, title,
    // Igual que la web: los extras que solo existen como agregado no se venden sueltos.
    data: products.filter(p => p.category === id && !p.optionGroup?.hidden && (!['extras', 'salsas'].includes(id) || standaloneExtra(p))),
  })).filter(sec => sec.data.length), [products]);

  const jump = id => {
    setActive(id);
    const index = sections.findIndex(sec => sec.id === id);
    if (index >= 0) listRef.current?.scrollToLocation({ sectionIndex: index, itemIndex: 0, viewOffset: 0, animated: false });
  };

  return <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
    <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
      <Display size={40}>Menú</Display>
      {!storeOpen && <View style={{ marginTop: 10 }}><Notice tone="bad">Tienda cerrada: puedes mirar, pero los pedidos están pausados.</Notice></View>}
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}>
      {sections.map(sec => <Chip key={sec.id} label={sec.title} active={active === sec.id} onPress={() => jump(sec.id)}/>)}
    </ScrollView>
    {status === 'loading' && !products.length ? <Text style={{ padding: 16, color: colors.muted }}>Cargando menú…</Text> :
    <SectionList ref={listRef} sections={sections} keyExtractor={item => item.id} stickySectionHeadersEnabled={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 10 }}
      onViewableItemsChanged={({ viewableItems }) => { const first = viewableItems.find(v => v.section)?.section?.id; if (first) setActive(first); }}
      onScrollToIndexFailed={() => {}}
      renderSectionHeader={({ section }) => <Display size={24} style={{ marginTop: 18, marginBottom: 4 }}>{section.title}</Display>}
      renderItem={({ item }) => {
        const soldOut = stock[item.id] === false;
        return <Pressable onPress={() => router.push(`/producto/${item.id}`)} accessibilityRole="button" accessibilityLabel={`${item.name}, ${soldOut ? 'agotado' : money(priceValue(item.prices[0][1]))}`}
          style={({ pressed }) => [st.row, pressed && { transform: [{ scale: 0.98 }] }, soldOut && { opacity: 0.55 }]}>
          <ProductPhoto product={item} style={st.photo} contentFit={item.category === 'bebidas' ? 'contain' : 'cover'}/>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={st.name}>{item.name}</Text>
            {!!item.description && <Text numberOfLines={2} style={st.desc}>{item.description}</Text>}
            <Text style={st.price}>{soldOut ? 'AGOTADO' : item.prices.length > 1 ? `Desde ${money(priceValue(item.prices[0][1]))}` : money(priceValue(item.prices[0][1]))}</Text>
          </View>
          <View style={st.add}><Text style={{ color: colors.cream, fontSize: 22, marginTop: -2 }}>+</Text></View>
        </Pressable>;
      }}/>}
  </View>;
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: 16, padding: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  photo: { width: 84, height: 84, borderRadius: 12 },
  name: { fontFamily: 'Anton', fontSize: 18, textTransform: 'uppercase', color: colors.ink },
  desc: { color: colors.muted, fontSize: 12.5, lineHeight: 17 },
  price: { fontWeight: '800', fontSize: 14, marginTop: 2 },
  add: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
});

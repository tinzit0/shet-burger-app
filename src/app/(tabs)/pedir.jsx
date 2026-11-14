import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, SectionList, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { CartBar, OutlinePill, TopBar, WhatsAppFab, useReducedMotion } from '../../components/brand';
import { ProductPhoto, productImagePath } from '../../components/ui';
import { useApp } from '../../lib/store';
import { colors, fonts, imageUrl, money, OPENING_TIME } from '../../lib/theme';
import { priceValue, standaloneExtra } from '../../shared/customization.js';
import { bestSellers } from '../../shared/bestSellers.js';

// La carta de /delivery en el celular: portada con las 3 más pedidas, categorías y tarjetas oscuras.
const CATEGORIES = [['burgers', 'Hamburguesas', 'BURGERS'], ['promos', 'Promociones', 'PROMOCIONES'], ['fritos', 'Fritos', 'FRITOS'], ['bebidas', 'Bebidas', 'BEBIDAS'], ['salsas', 'Salsas', 'SALSAS'], ['extras', 'Extras', 'EXTRAS']];
const open = id => router.push(`/producto/${id}`);

function Cover({ products, stock }) {
  const { width } = useWindowDimensions();
  const slides = useMemo(() => bestSellers(products).filter(p => p.image), [products]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const listRef = useRef(null);
  const reduced = useReducedMotion();
  const height = Math.round(width * 1.75);

  // Igual que la web: cambia sola cada 11 s, salvo que el cliente la pause o la deslice.
  useFocusEffect(useCallback(() => {
    if (paused || reduced || slides.length < 2) return;
    const t = setTimeout(() => { const next = (index + 1) % slides.length; listRef.current?.scrollToIndex({ index: next, animated: true }); setIndex(next); }, 11000);
    return () => clearTimeout(t);
  }, [index, paused, reduced, slides.length]));

  if (!slides.length) return null;
  return <View style={{ height }}>
    <FlatList ref={listRef} data={slides} horizontal pagingEnabled showsHorizontalScrollIndicator={false} keyExtractor={p => p.id}
      getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
      onMomentumScrollEnd={e => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
      renderItem={({ item, index: i }) => {
        const rosa = i % 2 === 1, sold = stock[item.id] === false;
        return <View style={{ width, height, backgroundColor: rosa ? '#c2457f' : colors.night }}>
          <LinearGradient colors={rosa ? ['#e57fb0', '#a12e63', '#2a0a18'] : ['#2a1220', '#0b0a0c', '#4a1030']} style={StyleSheet.absoluteFill}/>
          {/* Foto a todo el ancho, fundida con el fondo hacia abajo como la portada web. */}
          <View style={{ position: 'absolute', top: 0, left: 0, width, height: height * 0.53 }}>
            <Image source={{ uri: imageUrl(item.image) }} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={{ top: '64%', left: '50%' }} transition={200}/>
            <LinearGradient colors={[rosa ? '#c2457f' : colors.night, 'transparent', 'transparent', rosa ? '#a12e63' : '#1a0b13']} locations={[0, 0.15, 0.62, 1]} style={StyleSheet.absoluteFill}/>
          </View>
          <Image source={{ uri: imageUrl('/assets/campaign/shet-pattern-1600.webp') }} style={[StyleSheet.absoluteFill, { opacity: 0.07 }]} contentFit="cover"/>
          <View style={{ paddingHorizontal: 22, paddingTop: 18 }}>
            <Text style={st.coverBrand}>SHET</Text>
            <Text style={st.coverSub}>FAT SMASH BURGERS</Text>
          </View>
          <View style={st.badge}><Text style={st.badgeText}>INCLUYE PAPITAS ↗</Text></View>
          <Text style={st.rank}>#{i + 1}</Text>
          <View style={{ position: 'absolute', left: 22, right: 22, bottom: 64, gap: 8 }}>
            <Text style={st.coverKicker}>{i === 0 ? 'LA MÁS PEDIDA' : i === 1 ? 'FAVORITA DE LA CASA' : 'PARA LOS VALIENTES'}</Text>
            <Text style={st.coverName}>{item.name}</Text>
            <Text style={st.coverDesc} numberOfLines={3}>{item.description}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}><Text style={st.from}>Desde</Text><Text style={st.coverPrice}>{money(priceValue(item.prices[0][1]))}</Text></View>
            <Pressable onPress={() => open(item.id)} disabled={sold} accessibilityRole="button" accessibilityLabel={`Pedir ${item.name}`} style={({ pressed }) => [st.pide, pressed && { transform: [{ translateX: 3 }, { translateY: 3 }] }]}>
              <View style={st.pideShadow}/>
              <View style={st.pideFace}><Text style={st.pideText}>{sold ? 'AGOTADA' : 'PIDE AQUÍ'}</Text><Text style={[st.pideText, { fontFamily: fonts.button, fontSize: 20 }]}>↗</Text></View>
            </Pressable>
          </View>
        </View>;
      }}/>
    <View style={st.dots}>
      <Text style={st.dotsText}>{String(index + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}</Text>
      {slides.map((_, i) => <View key={i} style={[st.dot, i === index && st.dotOn]}/>)}
      <Pressable onPress={() => setPaused(p => !p)} accessibilityLabel={paused ? 'Reanudar portada' : 'Pausar portada'} hitSlop={8} style={st.pause}><Text style={{ color: colors.cream, fontSize: 12 }}>{paused ? '▶' : 'II'}</Text></Pressable>
    </View>
  </View>;
}

function ProductCard({ item, soldOut }) {
  const drink = item.category === 'bebidas';
  const label = item.prices.length === 1 && item.category !== 'burgers' ? item.prices[0][0] : null;
  return <Pressable onPress={() => open(item.id)} accessibilityRole="button" accessibilityLabel={`${item.name}, ${soldOut ? 'agotado' : money(priceValue(item.prices[0][1]))}`}
    style={({ pressed }) => [st.card, pressed && { transform: [{ scale: 0.98 }] }]}>
    {(productImagePath(item)) && <View style={[st.cardPhoto, drink && { backgroundColor: colors.white, width: 84 }]}>
      <ProductPhoto product={item} style={StyleSheet.absoluteFill} contentFit={drink ? 'contain' : 'cover'}/>
      {soldOut && <View style={st.soldOverlay}><Text style={st.soldText}>AGOTADO</Text></View>}
    </View>}
    <View style={{ flex: 1, paddingVertical: 12, paddingLeft: productImagePath(item) ? 10 : 12, paddingRight: 52, gap: 5 }}>
      <Text style={st.cardName}>{item.name}</Text>
      {soldOut && <Text style={st.soldBadge}>AGOTADO</Text>}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {label && <Text style={st.variant}>{label}</Text>}
        <Text style={st.pricePill}>{money(priceValue(item.prices[0][1]))}</Text>
      </View>
      {!!item.description && <Text style={st.cardDesc} numberOfLines={3}>{item.description}</Text>}
    </View>
    <View style={[st.plus, soldOut && { backgroundColor: '#4a4549' }]}><Text style={{ fontSize: 22, color: soldOut ? colors.nightMuted : colors.ink, marginTop: -2 }}>+</Text></View>
  </Pressable>;
}

export default function Pedir() {
  const { products, stock, storeOpen, status, cartCount } = useApp();
  const listRef = useRef(null);
  const sections = useMemo(() => CATEGORIES.map(([id, chip, title]) => ({
    id, chip, title,
    data: products.filter(p => p.category === id && !p.optionGroup?.hidden && (!['extras', 'salsas'].includes(id) || standaloneExtra(p))),
  })).filter(s => s.data.length), [products]);
  const jump = i => listRef.current?.scrollToLocation({ sectionIndex: i, itemIndex: 0, viewOffset: 60, animated: true });

  return <View style={{ flex: 1, backgroundColor: colors.night }}>
    <TopBar onPedir={() => sections.length && jump(0)}/>
    {status === 'loading' && !products.length ? <Text style={{ padding: 20, color: colors.nightMuted, fontFamily: fonts.body }}>Cargando la carta…</Text> :
    <SectionList ref={listRef} sections={sections} keyExtractor={p => p.id} stickySectionHeadersEnabled={false} onScrollToIndexFailed={() => {}}
      contentContainerStyle={{ paddingBottom: cartCount ? 100 : 40 }}
      ListHeaderComponent={<>
        {!storeOpen && <View style={st.closed}><Text style={st.closedText}>TIENDA CERRADA · Abrimos a las {OPENING_TIME} hrs. Puedes mirar la carta.</Text></View>}
        <Cover products={products} stock={stock}/>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.chips} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 14 }}>
          {sections.map((s, i) => <OutlinePill small key={s.id} title={s.chip} onPress={() => jump(i)}/>)}
        </ScrollView>
      </>}
      renderSectionHeader={({ section }) => section.id === 'burgers'
        ? <View style={{ alignItems: 'center', paddingTop: 30, paddingBottom: 18, paddingHorizontal: 16 }}><Text style={st.bigTitle}>{section.title}</Text><Text style={st.note}>TODAS LAS HAMBURGUESAS INCLUYEN PAPAS FRITAS.</Text></View>
        : <View style={st.sectionHead}><Text style={st.sectionTitle}>{section.title}</Text><Text style={st.count}>{String(section.data.length).padStart(2, '0')} OPCIONES</Text></View>}
      renderItem={({ item }) => <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}><ProductCard item={item} soldOut={stock[item.id] === false}/></View>}/>}
    <CartBar/>
    {!cartCount && <WhatsAppFab/>}
  </View>;
}

const st = StyleSheet.create({
  coverBrand: { fontFamily: fonts.display, color: colors.cream, fontSize: 30, lineHeight: 32 },
  coverSub: { fontFamily: fonts.button, color: colors.cream, fontSize: 9, letterSpacing: 1 },
  badge: { position: 'absolute', right: 22, top: 140, backgroundColor: colors.pink, paddingHorizontal: 14, paddingVertical: 10, transform: [{ rotate: '-6deg' }], shadowColor: colors.ink, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4 },
  badgeText: { fontFamily: fonts.display, fontSize: 15, color: colors.ink },
  rank: { position: 'absolute', right: 14, top: '42%', fontFamily: fonts.display, fontSize: 130, color: 'rgba(255,249,255,0.08)' },
  coverKicker: { fontFamily: fonts.button, color: colors.cream, fontSize: 11, letterSpacing: 1.6 },
  coverName: { fontFamily: fonts.display, color: colors.cream, fontSize: 52, lineHeight: 56, textTransform: 'uppercase', transform: [{ skewX: '-4deg' }] },
  coverDesc: { fontFamily: fonts.bodyBold, color: colors.cream, fontSize: 12, lineHeight: 17, textTransform: 'uppercase' },
  from: { fontFamily: fonts.bodyMedium, color: colors.nightMuted, fontSize: 13 },
  coverPrice: { fontFamily: fonts.button, color: colors.cream, fontSize: 24 },
  pide: { height: 58, marginTop: 6, marginRight: 8 },
  pideShadow: { position: 'absolute', left: 8, top: 8, right: -8, bottom: -8, backgroundColor: colors.pink },
  pideFace: { flex: 1, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  pideText: { fontFamily: fonts.display, fontSize: 28, color: colors.ink },
  dots: { position: 'absolute', bottom: 16, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  dotsText: { fontFamily: fonts.button, color: colors.cream, fontSize: 11, marginRight: 6 },
  dot: { width: 14, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,249,255,0.35)' },
  dotOn: { width: 18, backgroundColor: colors.pink },
  pause: { marginLeft: 10, width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.cardLine, alignItems: 'center', justifyContent: 'center' },
  chips: { flexGrow: 0, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.cardLine },
  bigTitle: { fontFamily: fonts.display, color: colors.cream, fontSize: 82, lineHeight: 88 },
  note: { fontFamily: fonts.button, color: colors.cream, fontSize: 11, letterSpacing: 0.4, textAlign: 'center' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 30, marginBottom: 16, paddingTop: 26, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.cardLine },
  sectionTitle: { fontFamily: fonts.display, color: colors.pink, fontSize: 36 },
  count: { fontFamily: fonts.button, color: colors.cream, fontSize: 11, borderWidth: 1, borderColor: colors.cardLine, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, overflow: 'hidden' },
  card: { flexDirection: 'row', minHeight: 116, backgroundColor: colors.card, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.cardLine, overflow: 'hidden' },
  cardPhoto: { width: 106, backgroundColor: '#222' },
  soldOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  soldText: { fontFamily: fonts.button, color: colors.pink, fontSize: 13, letterSpacing: 1.4 },
  soldBadge: { alignSelf: 'flex-start', fontFamily: fonts.button, fontSize: 9, color: colors.cream, backgroundColor: '#8e2538', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  cardName: { fontFamily: fonts.display, color: colors.cream, fontSize: 19, textTransform: 'uppercase' },
  variant: { fontFamily: fonts.bodyBold, color: colors.cream, fontSize: 11 },
  pricePill: { fontFamily: fonts.bodyBold, color: colors.ink, backgroundColor: colors.pink, fontSize: 11, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, overflow: 'hidden' },
  cardDesc: { fontFamily: fonts.bodyBold, color: colors.cream, fontSize: 9.5, lineHeight: 13, textTransform: 'uppercase' },
  plus: { position: 'absolute', right: 12, top: '50%', marginTop: -17, width: 34, height: 34, borderRadius: 17, backgroundColor: colors.pink, alignItems: 'center', justifyContent: 'center' },
  closed: { backgroundColor: colors.late, padding: 14 },
  closedText: { fontFamily: fonts.button, color: colors.white, fontSize: 12, letterSpacing: 0.8, textAlign: 'center' },
});

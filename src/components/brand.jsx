import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, money, WHATSAPP_URL } from '../lib/theme';
import { useApp } from '../lib/store';

// Piezas visuales de la web (header, píldoras rosadas, cintas, WhatsApp) en versión nativa.

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub?.remove?.();
  }, []);
  return reduced;
}

const press = fn => () => { Haptics.selectionAsync().catch(() => {}); fn?.(); };

// "PEDIR AHORA ↗": píldora rosada de la web. ring = el aro exterior del botón del hero.
export function PinkPill({ title, onPress, ring, big, style, dark }) {
  const pill = <Pressable accessibilityRole="button" onPress={press(onPress)} hitSlop={6}
    style={({ pressed }) => [st.pill, big && st.pillBig, dark && { backgroundColor: colors.ink }, pressed && st.pressed]}>
    <Text style={[st.pillText, big && st.pillTextBig, dark && { color: colors.cream }]}>{title}</Text>
    <Text style={[st.arrow, big && { fontSize: 20 }, dark && { color: colors.cream }]}>↗</Text>
  </Pressable>;
  return ring ? <View style={[st.ring, style]}>{pill}</View> : <View style={style}>{pill}</View>;
}

// Botón con borde (Instagram, categorías): "SEGUIR A @SHETBURGER ↗".
export function OutlinePill({ title, onPress, style, small }) {
  return <Pressable accessibilityRole="button" onPress={press(onPress)} hitSlop={6} style={({ pressed }) => [st.outline, small && st.outlineSmall, pressed && st.pressed, style]}>
    <Text style={[st.outlineText, small && { fontFamily: fonts.bodyMedium, fontSize: 13, letterSpacing: 0, textTransform: 'none' }]}>{title}</Text>
    <Text style={[st.arrow, { color: colors.cream, fontSize: small ? 13 : 16 }]}>↗</Text>
  </Pressable>;
}

// Header negro de la web: logo + PEDIR AHORA (+ acceso al pedido si hay productos).
export function TopBar({ onPedir, transparent }) {
  const insets = useSafeAreaInsets();
  const { cartCount } = useApp();
  return <View style={[st.top, { paddingTop: insets.top + 8 }, transparent && { backgroundColor: 'rgba(11,10,12,0.55)' }]}>
    <Pressable onPress={() => router.navigate('/')} accessibilityLabel="SHET BURGER, inicio" hitSlop={8}>
      <Image source={require('../../assets/logo.png')} style={st.logo} contentFit="cover"/>
    </Pressable>
    <View style={{ flex: 1 }}/>
    <PinkPill title="Pedir ahora" onPress={onPedir || (() => router.navigate('/pedir'))}/>
    {cartCount > 0 && <Pressable onPress={press(() => router.navigate('/carrito'))} accessibilityLabel={`Ver mi pedido, ${cartCount} productos`} style={({ pressed }) => [st.cartDot, pressed && st.pressed]}>
      <Text style={st.cartDotText}>{cartCount}</Text>
    </Pressable>}
  </View>;
}

export function WhatsAppFab({ bottom = 16 }) {
  return <Pressable accessibilityRole="link" accessibilityLabel="Hablar con SHET Burger por WhatsApp" onPress={press(() => Linking.openURL(WHATSAPP_URL))}
    style={({ pressed }) => [st.wa, { bottom }, pressed && st.pressed]}>
    <Ionicons name="logo-whatsapp" size={28} color={colors.white}/>
  </Pressable>;
}

// Barra "VER MI PEDIDO" de la carta web, sobre la barra de pestañas.
export function CartBar() {
  const { cartCount, cartSubtotal } = useApp();
  if (!cartCount) return null;
  return <Pressable onPress={press(() => router.navigate('/carrito'))} accessibilityRole="button" accessibilityLabel={`Ver mi pedido: ${cartCount} productos, ${money(cartSubtotal)}`}
    style={({ pressed }) => [st.cartBar, pressed && st.pressed]}>
    <View style={st.cartCount}><Text style={{ fontFamily: fonts.button, color: colors.pink }}>{cartCount}</Text></View>
    <Text style={st.cartLabel}>VER MI PEDIDO</Text>
    <Text style={st.cartTotal}>{money(cartSubtotal)}</Text>
  </Pressable>;
}

// Estrella de 4 puntas de la web, dibujada con dos cuadrados girados.
export const Star = ({ size = 18, color = colors.pink }) => <Text style={{ fontSize: size, color, marginHorizontal: size * 0.6, lineHeight: size * 1.2 }}>✦</Text>;

// Cinta de palabras gigantes que corre sin fin (decorativa, se detiene con "reducir movimiento").
export function Marquee({ words, reverse, outline, size = 46, speed = 38 }) {
  const reduced = useReducedMotion();
  const x = useRef(new Animated.Value(0)).current;
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!width || reduced) return;
    x.setValue(reverse ? -width : 0);
    const loop = Animated.loop(Animated.timing(x, { toValue: reverse ? 0 : -width, duration: (width / speed) * 1000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [width, reduced, reverse, speed, x]);
  const row = <View style={{ flexDirection: 'row', alignItems: 'center' }} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
    {[...words, ...words].map((w, i) => <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={[st.marquee, { fontSize: size, lineHeight: size * 1.15 }, outline && st.marqueeOutline]}>{w}</Text><Star size={size * 0.45}/>
    </View>)}
  </View>;
  return <View style={{ overflow: 'hidden' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: x }] }}>{row}<View style={{ flexDirection: 'row' }}>{row.props.children}</View></Animated.View>
  </View>;
}

export const st = StyleSheet.create({
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.94 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.pink, borderRadius: 999, paddingHorizontal: 16, minHeight: 44 },
  pillBig: { minHeight: 56, paddingHorizontal: 22 },
  pillText: { fontFamily: fonts.button, fontSize: 12, letterSpacing: 1.4, color: colors.ink, textTransform: 'uppercase' },
  pillTextBig: { fontSize: 16, letterSpacing: 1.8 },
  arrow: { fontFamily: fonts.button, fontSize: 15, color: colors.ink },
  ring: { padding: 6, borderRadius: 999, borderWidth: 1.5, borderColor: 'rgba(240,155,196,0.55)', alignSelf: 'center' },
  outline: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 999, borderWidth: 2, borderColor: colors.cream, paddingHorizontal: 20, minHeight: 50, alignSelf: 'flex-start' },
  outlineSmall: { borderWidth: 1, borderColor: colors.cardLine, minHeight: 40, paddingHorizontal: 14, gap: 8 },
  outlineText: { fontFamily: fonts.display, fontSize: 19, color: colors.cream, textTransform: 'uppercase', letterSpacing: 0.4 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 10, backgroundColor: colors.night, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.cardLine },
  logo: { width: 42, height: 42, borderRadius: 21 },
  cartDot: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.cardLine, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink },
  cartDotText: { fontFamily: fonts.button, color: colors.pink, fontSize: 15 },
  wa: { position: 'absolute', right: 16, width: 54, height: 54, borderRadius: 27, backgroundColor: colors.whatsapp, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  cartBar: { position: 'absolute', left: 12, right: 12, bottom: 12, minHeight: 56, borderRadius: 999, backgroundColor: colors.pink, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 12, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  cartCount: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  cartLabel: { flex: 1, fontFamily: fonts.button, fontSize: 13, letterSpacing: 1.4, color: colors.ink },
  cartTotal: { fontFamily: fonts.button, fontSize: 15, color: colors.ink, marginRight: 12 },
  marquee: { fontFamily: fonts.display, color: colors.pink, textTransform: 'uppercase' },
  // RN no dibuja texto calado: letra oscura con halo rosado imita el contorno de la web.
  marqueeOutline: { color: colors.night, textShadowColor: colors.pink, textShadowRadius: 2, textShadowOffset: { width: 0, height: 0 } },
});

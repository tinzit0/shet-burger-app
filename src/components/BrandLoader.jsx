import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useApp } from '../lib/store';
import { colors, fonts } from '../lib/theme';
import { useReducedMotion } from './brand';

// Pantalla de carga de marca. Continúa la pantalla nativa (mismo logo, mismo negro)
// y se queda hasta que el menú está listo: así nunca se ve una carta vacía.
// Se muestra una vez por apertura, por eso puede tener un poco de movimiento.
const MAX_WAIT = 4000;

export default function BrandLoader() {
  const { status } = useApp();
  const reduced = useReducedMotion();
  const [gone, setGone] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;
  const enter = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    // La pantalla nativa se oculta cuando esta ya está dibujada encima: el cambio no se nota.
    SplashScreen.hideAsync().catch(() => {});
    Animated.timing(enter, { toValue: 1, duration: reduced ? 0 : 420, easing: Easing.bezier(0.23, 1, 0.32, 1), useNativeDriver: true }).start();
    const loop = reduced ? null : Animated.loop(Animated.timing(bar, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true }));
    loop?.start();
    const t = setTimeout(() => setTimedOut(true), MAX_WAIT);
    return () => { loop?.stop(); clearTimeout(t); };
  }, [bar, enter, reduced]);

  const ready = status !== 'loading' || timedOut;
  useEffect(() => {
    if (!ready) return;
    Animated.timing(fade, { toValue: 0, duration: reduced ? 150 : 260, delay: 120, easing: Easing.bezier(0.23, 1, 0.32, 1), useNativeDriver: true }).start(() => setGone(true));
  }, [ready, fade, reduced]);

  if (gone) return null;
  const scale = enter.interpolate({ inputRange: [0, 1], outputRange: reduced ? [1, 1] : [0.94, 1] });
  const x = bar.interpolate({ inputRange: [0, 1], outputRange: [-90, 150] });
  return <Animated.View style={[StyleSheet.absoluteFill, st.wrap, { opacity: fade }]} pointerEvents={ready ? 'none' : 'auto'} accessibilityLabel="Cargando SHET BURGER">
    <Animated.View style={{ alignItems: 'center', opacity: enter, transform: [{ scale }] }}>
      <View style={st.halo}><Image source={require('../../assets/logo.png')} style={st.logo} contentFit="cover"/></View>
      <Text style={st.title}>SHET BURGER</Text>
      <Text style={st.sub}>FAT SMASH BURGERS · NONGUÉN</Text>
      <View style={st.track}><Animated.View style={[st.fill, { transform: [{ translateX: reduced ? 0 : x }] }]}/></View>
    </Animated.View>
    <Text style={st.foot}>#MUERDELATENTACIÓN</Text>
  </Animated.View>;
}

const st = StyleSheet.create({
  wrap: { backgroundColor: colors.night, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  halo: { width: 170, height: 170, borderRadius: 85, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(240,155,196,0.08)', borderWidth: 1, borderColor: 'rgba(240,155,196,0.25)' },
  logo: { width: 150, height: 150, borderRadius: 75 },
  title: { fontFamily: fonts.display, fontSize: 40, color: colors.cream, marginTop: 26, letterSpacing: 0.5 },
  sub: { fontFamily: fonts.button, fontSize: 11, letterSpacing: 2, color: colors.pink, marginTop: 4 },
  track: { width: 150, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,249,255,0.12)', marginTop: 26, overflow: 'hidden' },
  fill: { width: 60, height: 3, borderRadius: 2, backgroundColor: colors.pink },
  foot: { position: 'absolute', bottom: 48, fontFamily: fonts.display, fontSize: 16, color: 'rgba(255,249,255,0.25)', letterSpacing: 1 },
});

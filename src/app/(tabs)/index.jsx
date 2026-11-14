import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import MapEmbed from '../../components/MapEmbed';
import { Marquee, OutlinePill, PinkPill, TopBar, WhatsAppFab, useReducedMotion } from '../../components/brand';
import { useApp } from '../../lib/store';
import { loadPublicCoupons } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { business, colors, fonts, imageUrl, OPENING_TIME } from '../../lib/theme';
import { couponLabel } from '../../shared/couponRules.js';

// Inicio = la portada de la web en el celular, en el mismo orden:
// video de la mirada → franja de datos → cintas → SHET MOOD → crew → #MUERDE → Instagram → ubicación → pie.
const defaults = { heroEyebrow: 'FAT SMASH BURGERS · NONGUÉN', heroTitle: '¿Hambre?', heroAccent: 'Pide SHET', heroPrimaryLabel: 'PEDIR AHORA' };
const pedir = () => router.navigate('/pedir');

function useLoopVideo(source) {
  const player = useVideoPlayer(source, p => { p.loop = true; p.muted = true; p.play(); });
  // Pausa el video cuando la pestaña no está a la vista: ahorra batería.
  useFocusEffect(useCallback(() => { try { player.play(); } catch {} return () => { try { player.pause(); } catch {} }; }, [player]));
  return player;
}

function Hero({ content }) {
  const { height } = useWindowDimensions();
  const player = useLoopVideo(require('../../../assets/videos/mirada.mp4'));
  return <View style={{ height: Math.max(560, height * 0.86), backgroundColor: '#3a0a1c' }}>
    <Image source={{ uri: imageUrl('/assets/campaign/eye-poster.webp') }} style={StyleSheet.absoluteFill} contentFit="cover"/>
    <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} allowsPictureInPicture={false} surfaceType="textureView"/>
    <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(60,0,25,0.25)', 'rgba(180,20,70,0.55)']} locations={[0.45, 0.7, 1]} style={StyleSheet.absoluteFill}/>
    <View style={st.heroCopy}>
      <Text style={st.heroEyebrow}>{content.heroEyebrow}</Text>
      <Text style={st.heroTitle}>{content.heroTitle}</Text>
      <Text style={[st.heroTitle, { color: colors.pink, fontSize: 40, lineHeight: 44 }]}>{content.heroAccent}</Text>
      <PinkPill big ring title={content.heroPrimaryLabel === 'PEDIR' ? 'PEDIR AHORA' : content.heroPrimaryLabel} onPress={pedir} style={{ marginTop: 18 }}/>
    </View>
  </View>;
}

function InfoStrip() {
  return <View style={{ backgroundColor: colors.night }}>
    {[['HORARIO', `ABRIMOS ${OPENING_TIME} HRS`], ['RETIRO', 'RÍO LOA 130 · NONGUÉN'], ['DELIVERY', 'COSTO SEGÚN TU POBLACIÓN']].map(([k, v]) =>
      <View key={k} style={st.info}><Text style={st.infoKey}>{k}</Text><Text style={st.infoValue}>{v}</Text></View>)}
    <Pressable onPress={pedir} accessibilityRole="button" style={({ pressed }) => [st.carta, pressed && { opacity: 0.85 }]}>
      <Text style={st.cartaText}>VER LA CARTA</Text><Text style={[st.cartaText, { fontFamily: fonts.button }]}>↗</Text>
    </Pressable>
  </View>;
}

function MoodBoard() {
  const { width } = useWindowDimensions();
  const w = width - 40, half = w / 2;
  const photo = (path, style) => <Image source={{ uri: imageUrl(path) }} style={style} contentFit="cover" transition={200} cachePolicy="memory-disk"/>;
  return <View style={{ paddingHorizontal: 20, paddingVertical: 36, backgroundColor: colors.night }}>
    {photo('/assets/campaign/mesa-shet.jpg', { width: w, height: w * 1.12 })}
    <Text style={st.mood}>SHET <Text style={{ color: colors.pink }}>MOOD</Text></Text>
    <View style={{ flexDirection: 'row' }}>
      {photo('/assets/campaign/home-foto-1-1024.webp', { width: half, height: half * 1.25 })}
      {photo('/assets/campaign/momento-shet.jpg', { width: half, height: half * 1.25 })}
    </View>
    <View style={{ flexDirection: 'row' }}>
      <View style={{ width: half, height: half * 1.25, justifyContent: 'center', paddingLeft: 12 }}><Text style={st.moodSide}>CRUJIENTE.{'\n'}JUGOSA.{'\n'}DESORDENADA.</Text></View>
      {photo('/assets/campaign/auto-shet.jpg', { width: half, height: half * 1.25 })}
    </View>
  </View>;
}

const crew = [['abrazo', 'BFF'], ['tocino', 'BACON LOVERS'], ['pepinillo', 'AJÍ PEPINILLO']];
function Crew() {
  const reduced = useReducedMotion();
  const x = useRef(new Animated.Value(0)).current;
  const card = 150, gap = 16, span = (card + gap) * crew.length;
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(Animated.timing(x, { toValue: -span, duration: 14000, easing: Easing.linear, useNativeDriver: true }));
    loop.start(); return () => loop.stop();
  }, [reduced, span, x]);
  const cards = [...crew, ...crew, ...crew];
  return <View style={{ backgroundColor: colors.night, paddingVertical: 34 }}>
    <View style={{ paddingHorizontal: 20 }}>
      <Text style={st.kicker}>PERSONAJES SHET</Text>
      <Text style={st.h2}>LA CREW{'\n'}<Text style={{ color: colors.pink }}>DE LA CAJA ROSA</Text></Text>
    </View>
    <View style={{ overflow: 'hidden', marginTop: 22, paddingVertical: 10 }}>
      <Animated.View style={{ flexDirection: 'row', gap, paddingLeft: 20, transform: [{ translateX: x }] }}>
        {cards.map(([name, label], i) => <View key={i} style={[st.crewCard, { width: card, transform: [{ rotate: i % 2 ? '2deg' : '-2deg' }] }]}>
          <Image source={{ uri: imageUrl(`/assets/caricaturas/${reduced ? `${name}-still.png` : `${name}.gif`}`) }} style={{ width: card - 30, height: card - 50 }} contentFit="contain" accessibilityLabel={label}/>
          <View style={st.crewTag}><Text style={st.crewTagText}>{label}</Text></View>
        </View>)}
      </Animated.View>
    </View>
  </View>;
}

function Tape() {
  const { width } = useWindowDimensions();
  const player = useLoopVideo(require('../../../assets/videos/plancha.mp4'));
  const w = width - 50;
  return <View style={{ backgroundColor: '#f1efef', paddingVertical: 34, alignItems: 'center', overflow: 'hidden' }}>
    <View style={[st.tape, { transform: [{ rotate: '-4deg' }] }]}><Marquee words={['FAT SMASH', 'PINK BOX', 'SHET MOOD']} size={20} speed={30}/></View>
    <View style={{ width: w, height: w * 1.25, marginTop: 18 }}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.pink, transform: [{ translateX: 10 }, { translateY: 10 }] }]}/>
      <View style={{ flex: 1, borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.ink, overflow: 'hidden' }}>
        <Image source={{ uri: imageUrl('/assets/campaign/hero-poster-960.webp') }} style={StyleSheet.absoluteFill} contentFit="cover"/>
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} surfaceType="textureView"/>
        <View style={{ position: 'absolute', right: 14, bottom: 12, alignItems: 'flex-end' }}>
          <Text style={st.tapeCaption}>#MUERDE</Text><Text style={[st.tapeCaption, { color: colors.pink }]}>LA TENTACIÓN</Text>
        </View>
      </View>
    </View>
  </View>;
}

// Igual que la web: una publicación de Instagram con el video del feed desplazándose.
function Instagram() {
  const player = useLoopVideo(require('../../../assets/videos/instagram-feed.mp4'));
  const ig = () => Linking.openURL(business.instagram);
  return <View style={{ backgroundColor: colors.night, padding: 20, paddingTop: 40, gap: 18 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Ionicons name="logo-instagram" size={16} color={colors.pink}/><Text style={st.kicker}>@SHETBURGER</Text></View>
    <Text style={st.h2}>SÍGUENOS{'\n'}<Text style={{ color: colors.pink }}>EN INSTAGRAM</Text></Text>
    <Text style={st.copy}>Promos, lanzamientos y lo que sale de la plancha cada noche. Todo pasa primero en nuestro Instagram.</Text>
    <OutlinePill title="Seguir a @shetburger" onPress={ig}/>
    <Pressable onPress={ig} accessibilityRole="link" accessibilityLabel="Abrir el Instagram de SHET Burger" style={[st.igCard, { width: '100%', maxWidth: 440, alignSelf: 'center' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }}>
        <View style={st.igAvatar}><Image source={require('../../../assets/logo.png')} style={{ width: 34, height: 34, borderRadius: 17 }}/></View>
        <View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.bodyBold, color: colors.ink }}>shetburger</Text><Text style={{ fontFamily: fonts.body, color: colors.muted, fontSize: 12 }}>Nonguén, Concepción</Text></View>
        <Ionicons name="logo-instagram" size={22} color={colors.ink}/>
      </View>
      <View style={{ width: '100%', aspectRatio: 0.82, backgroundColor: colors.ink, overflow: 'hidden' }}>
        <Image source={{ uri: imageUrl('/assets/campaign/scroll-video-poster.webp') }} style={StyleSheet.absoluteFill} contentFit="cover"/>
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} surfaceType="textureView"/>
      </View>
      <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: 12, paddingTop: 12 }}>
        <Ionicons name="heart-outline" size={24} color={colors.ink}/><Ionicons name="chatbubble-outline" size={22} color={colors.ink}/><Ionicons name="paper-plane-outline" size={22} color={colors.ink}/>
        <View style={{ flex: 1 }}/><Ionicons name="bookmark-outline" size={22} color={colors.ink}/>
      </View>
      <View style={st.igButton}><Ionicons name="logo-instagram" size={16} color={colors.white}/><Text style={{ fontFamily: fonts.button, color: colors.white, fontSize: 12, letterSpacing: 1.2 }}>SEGUIR A @SHETBURGER</Text></View>
    </Pressable>
  </View>;
}

function Location() {
  const maps = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(business.pickupAddress)}`;
  return <View style={{ backgroundColor: colors.night, padding: 20, paddingTop: 40, gap: 14 }}>
    <Text style={[st.h2, { fontSize: 52, lineHeight: 56 }]}>TU SHET{'\n'}<Text style={{ color: colors.pink }}>ESTÁ CERCA.</Text></Text>
    <Text style={st.copy}>Retira tu pedido en Río Loa 130, Nonguén, o pide despacho dentro de nuestras zonas disponibles.</Text>
    {/* Mapa real de Google, como la web, con la etiqueta de la dirección y "Abrir en Maps". */}
    <View style={{ borderWidth: 2, borderColor: colors.pink, overflow: 'hidden' }}>
      <MapEmbed address={business.pickupAddress} style={{ width: '100%', aspectRatio: 1.15 }}/>
      <View pointerEvents="none" style={st.mapTag}><Ionicons name="location-outline" size={15} color={colors.pink}/><Text style={{ fontFamily: fonts.button, color: colors.cream, fontSize: 11, letterSpacing: 1 }}>RÍO LOA 130 · NONGUÉN</Text></View>
      <Pressable onPress={() => Linking.openURL(maps)} style={st.mapOpen} hitSlop={6}><Text style={{ fontFamily: fonts.bodyMedium, color: colors.ink, fontSize: 13 }}>Abrir en Maps ↗</Text></Pressable>
    </View>
    <View style={st.pinkCard}>
      <Text style={{ fontFamily: fonts.button, fontSize: 11, letterSpacing: 1.6, color: colors.ink }}>DELIVERY Y RETIRO</Text>
      <Text style={{ fontFamily: fonts.display, fontSize: 42, lineHeight: 46, color: colors.ink, textTransform: 'uppercase' }}>Ven por tu SHET o te la llevamos.</Text>
      <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.ink }}>Elige tu modalidad al finalizar el pedido. El costo de despacho se muestra según tu población.</Text>
      <PinkPill dark title="Cómo llegar" onPress={() => Linking.openURL(maps)} style={{ alignSelf: 'flex-start' }}/>
      <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.ink }}>Retiro sin costo en {business.pickupAddress}.</Text>
    </View>
  </View>;
}

function Footer() {
  return <View style={{ backgroundColor: colors.night, borderTopWidth: 2, borderTopColor: colors.pink, padding: 20, paddingBottom: 110, gap: 18 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <Image source={require('../../../assets/logo.png')} style={{ width: 78, height: 78, borderRadius: 39 }}/>
      <Text style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 26, color: colors.cream }}>SHET{'\n'}BURGER</Text>
      <Text style={[st.copy, { flex: 1, fontSize: 13 }]}>{business.pickupAddress}{'\n'}Abrimos a las {OPENING_TIME} hrs.</Text>
    </View>
    <View style={{ flexDirection: 'row', gap: 24 }}>
      <Pressable onPress={pedir}><Text style={st.footLink}>PEDIR <Text style={{ color: colors.pink }}>↗</Text></Text></Pressable>
      <Pressable onPress={() => Linking.openURL(business.instagram)}><Text style={st.footLink}>INSTAGRAM <Text style={{ color: colors.pink }}>↗</Text></Text></Pressable>
    </View>
    <Pressable onPress={() => router.push('/panel')} hitSlop={8}><Text style={st.footLink}>ADMINISTRACIÓN</Text></Pressable>
  </View>;
}

export default function Home() {
  const { refresh, storeOpen, myOrders } = useApp();
  const [content, setContent] = useState(defaults);
  const [coupons, setCoupons] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const loadExtras = useCallback(async () => {
    // Los textos del inicio se editan en el panel web (/admin/content); la app usa los mismos.
    const [c, k] = await Promise.all([
      supabase.from('shet_site_content').select('payload').eq('id', 'main').maybeSingle(),
      loadPublicCoupons(),
    ]);
    if (c.data?.payload) setContent(v => ({ ...v, ...c.data.payload }));
    setCoupons(k.data || []);
  }, []);
  useEffect(() => { loadExtras().catch(() => {}); }, [loadExtras]);
  const last = myOrders[0];

  return <View style={{ flex: 1, backgroundColor: colors.night }}>
    <TopBar/>
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.pink} onRefresh={async () => { setRefreshing(true); await Promise.all([refresh(), loadExtras().catch(() => {})]); setRefreshing(false); }}/>}>
      <Hero content={content}/>
      {!storeOpen && <View style={st.closed}><Text style={st.closedText}>TIENDA CERRADA · Abrimos a las {OPENING_TIME} hrs. Mira la carta y pide cuando abramos.</Text></View>}
      {last && <Pressable onPress={() => router.push(`/pedido/${last.order_number}`)} style={st.track}><Text style={st.trackText}>SEGUIR MI PEDIDO #{last.order_number}</Text><Text style={[st.trackText, { color: colors.pink }]}>↗</Text></Pressable>}
      <InfoStrip/>
      <View style={{ backgroundColor: colors.night, paddingVertical: 22, gap: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.cardLine }}>
        <Marquee words={['PIDE SHET', '#MUERDELATENTACIÓN', 'HECHA AL MOMENTO']}/>
        <Marquee words={['NONGUÉN', 'PINK BOX', 'FAT SMASH']} reverse outline/>
      </View>
      {coupons.length > 0 && <View style={{ backgroundColor: colors.night, paddingTop: 30, gap: 12 }}>
        <Text style={[st.kicker, { paddingHorizontal: 20 }]}>PROMOCIONES CON CÓDIGO</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}>
          {coupons.map(c => <View key={c.id} style={st.coupon}><Text style={{ fontFamily: fonts.display, fontSize: 22, textTransform: 'uppercase', color: colors.ink }}>{c.title || c.code}</Text><Text style={{ fontFamily: fonts.body, color: colors.ink }}>{couponLabel(c)}</Text><Text style={st.code}>{c.code}</Text></View>)}
        </ScrollView>
      </View>}
      <MoodBoard/>
      <Crew/>
      <Tape/>
      <Instagram/>
      <Location/>
      <Footer/>
    </ScrollView>
    <WhatsAppFab/>
  </View>;
}

const st = StyleSheet.create({
  heroCopy: { position: 'absolute', left: 20, right: 20, bottom: 34, alignItems: 'center' },
  heroEyebrow: { fontFamily: fonts.button, color: colors.cream, fontSize: 11, letterSpacing: 1.4, marginBottom: 8 },
  heroTitle: { fontFamily: fonts.display, color: colors.cream, fontSize: 46, lineHeight: 50, textTransform: 'uppercase', textAlign: 'center' },
  info: { paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.cardLine },
  infoKey: { fontFamily: fonts.button, color: colors.pink, fontSize: 10.5, letterSpacing: 1.6 },
  infoValue: { fontFamily: fonts.display, color: colors.cream, fontSize: 18, marginTop: 2 },
  carta: { backgroundColor: colors.pink, minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  cartaText: { fontFamily: fonts.display, fontSize: 20, color: colors.ink, letterSpacing: 0.6 },
  mood: { fontFamily: fonts.display, fontSize: 64, lineHeight: 68, color: colors.cream, marginTop: -34, marginBottom: 6 },
  moodSide: { fontFamily: fonts.display, fontSize: 24, lineHeight: 25, color: colors.cream },
  kicker: { fontFamily: fonts.button, color: colors.pink, fontSize: 11, letterSpacing: 1.8 },
  h2: { fontFamily: fonts.display, color: colors.cream, fontSize: 44, lineHeight: 48, textTransform: 'uppercase', marginTop: 8 },
  copy: { fontFamily: fonts.body, color: colors.nightMuted, fontSize: 15, lineHeight: 22 },
  crewCard: { backgroundColor: colors.white, borderRadius: 14, borderWidth: 3, borderColor: colors.pink, alignItems: 'center', paddingTop: 12, paddingBottom: 12, shadowColor: colors.pinkDeep, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 5 }, elevation: 4 },
  crewTag: { backgroundColor: colors.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, marginTop: 4 },
  crewTagText: { fontFamily: fonts.display, color: colors.pink, fontSize: 13, textTransform: 'uppercase' },
  tape: { backgroundColor: colors.ink, paddingVertical: 6, width: '120%' },
  tapeCaption: { fontFamily: fonts.display, fontSize: 34, lineHeight: 36, color: colors.cream },
  igCard: { backgroundColor: colors.white, borderRadius: 22, overflow: 'hidden', borderWidth: 6, borderColor: '#1d1c1f' },
  igButton: { margin: 12, minHeight: 46, borderRadius: 10, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#c13584' },
  igAvatar: { padding: 2, borderRadius: 20, borderWidth: 2, borderColor: '#e1306c' },
  mapOpen: { position: 'absolute', top: 10, left: 10, backgroundColor: colors.white, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 2, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
  mapTag: { position: 'absolute', left: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.ink, paddingHorizontal: 12, paddingVertical: 9 },
  pinkCard: { backgroundColor: colors.pink, padding: 22, gap: 16 },
  footLink: { fontFamily: fonts.button, color: colors.cream, fontSize: 12, letterSpacing: 1.2 },
  closed: { backgroundColor: colors.late, padding: 14 },
  closedText: { fontFamily: fonts.button, color: colors.white, fontSize: 12, letterSpacing: 0.8, textAlign: 'center' },
  track: { backgroundColor: colors.ink, flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.cardLine },
  trackText: { fontFamily: fonts.button, color: colors.cream, fontSize: 12, letterSpacing: 1.2 },
  coupon: { width: 240, padding: 16, gap: 6, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.ink, backgroundColor: '#f6df32' },
  code: { alignSelf: 'flex-start', marginTop: 6, fontFamily: fonts.button, letterSpacing: 1.5, backgroundColor: colors.ink, color: '#f6df32', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
});

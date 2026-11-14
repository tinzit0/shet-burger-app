import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Display, Eyebrow, Field, Notice } from '../../components/ui';
import { GoogleButton } from '../../components/GoogleButton';
import { useApp } from '../../lib/store';
import { loadCustomerOrders, subscribe } from '../../lib/api';
import { signOut } from '../../lib/auth';
import { colors, fonts, money } from '../../lib/theme';

// Mis pedidos: los de este celular y, con Google, también los hechos desde la web u otro teléfono.
export default function Account() {
  const insets = useSafeAreaInsets();
  const { myOrders, profile, setProfile, auth } = useApp();
  const [remote, setRemote] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const userId = auth.user?.id;

  const load = useCallback(async () => {
    if (!userId) { setRemote([]); return; }
    setLoading(true);
    try { setRemote(await loadCustomerOrders(userId)); } catch { /* sin conexión: quedan los locales */ }
    setLoading(false);
  }, [userId]);
  useEffect(() => { load(); if (!userId) return; const off = subscribe('orders', load); return off; }, [load, userId]);

  // Une los pedidos de la cuenta con los hechos en este celular (sin repetir).
  const orders = useMemo(() => {
    const map = new Map();
    for (const o of [...remote, ...myOrders]) if (!map.has(o.order_number)) map.set(o.order_number, o);
    return [...map.values()].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [remote, myOrders]);

  return <ScrollView style={{ backgroundColor: colors.paper }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled"
    refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.pinkDeep} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}/>}>
    <View><Eyebrow>SHET BURGER</Eyebrow><Display size={38}>Mis pedidos</Display></View>

    {auth.user ? <Card style={st.account}>
      {auth.avatar ? <Image source={{ uri: auth.avatar }} style={st.avatar}/> : <View style={[st.avatar, st.avatarEmpty]}><Text style={{ fontFamily: fonts.display, color: colors.pink, fontSize: 20 }}>{(auth.name || '?')[0].toUpperCase()}</Text></View>}
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 15 }}>{auth.name}</Text>
        <Text style={{ fontFamily: fonts.body, color: colors.muted, fontSize: 12.5 }} numberOfLines={1}>{auth.user.email}</Text>
      </View>
      <Pressable onPress={() => signOut()} hitSlop={8}><Text style={st.out}>SALIR</Text></Pressable>
    </Card> : <Card style={{ gap: 10 }}>
      <Eyebrow>Tu cuenta</Eyebrow>
      <Text style={{ fontFamily: fonts.body, color: colors.ink, lineHeight: 20 }}>Inicia sesión con Google para ver tus pedidos en cualquier celular y también los que hagas en la página web.</Text>
      <GoogleButton/>
    </Card>}

    {loading && !orders.length && <ActivityIndicator color={colors.pinkDeep}/>}
    {orders.length ? orders.map(o => <Pressable key={o.order_number} onPress={() => router.push(`/pedido/${o.order_number}`)} style={({ pressed }) => [pressed && { transform: [{ scale: 0.98 }] }]}>
      <Card style={st.order}>
        <View style={st.orderIcon}><Ionicons name={o.status === 'Pedido entregado' ? 'checkmark-done' : 'time-outline'} size={20} color={colors.pinkDeep}/></View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: fonts.button, color: colors.ink }}>#{o.order_number}</Text>
          <Text style={{ fontFamily: fonts.body, color: colors.muted, fontSize: 13 }}>{new Date(o.created_at || Date.now()).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })} · {money(o.total)}</Text>
          {!!o.status && <Text style={{ fontFamily: fonts.bodyMedium, color: colors.pinkDeep, fontSize: 12 }}>{o.status}</Text>}
        </View>
        <Text style={{ fontFamily: fonts.button, color: colors.pinkDeep, fontSize: 12 }}>VER ↗</Text>
      </Card>
    </Pressable>) : !loading && <Card><Text style={{ fontFamily: fonts.body, color: colors.muted, lineHeight: 20 }}>Aún no tienes pedidos. Cuando pidas, aquí podrás seguirlos en vivo.</Text></Card>}

    <Card style={{ gap: 12 }}>
      <Eyebrow>Tus datos para pedir más rápido</Eyebrow>
      <Field label="Nombre" value={profile.name || auth.name} onChangeText={name => setProfile({ ...profile, name })} placeholder="Tu nombre"/>
      <Field label="Celular" prefix="+569" value={profile.phone} onChangeText={t => setProfile({ ...profile, phone: t.replace(/\D/g, '').slice(0, 8) })} keyboardType="number-pad" placeholder="12345678"/>
      <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted }}>Se guardan solo en este celular.</Text>
    </Card>

    <Pressable onPress={() => router.navigate('/panel')} accessibilityRole="button" style={({ pressed }) => [pressed && { transform: [{ scale: 0.98 }] }]}>
      <Card style={{ backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}><Eyebrow color={colors.pink}>Administración</Eyebrow><Text style={{ color: colors.cream, fontFamily: fonts.bodyMedium }}>¿Eres el dueño? Entra al panel de SHET.</Text></View>
        <Text style={{ color: colors.pink, fontFamily: fonts.button, fontSize: 12 }}>ENTRAR ↗</Text>
      </Card>
    </Pressable>
  </ScrollView>;
}

const st = StyleSheet.create({
  order: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orderIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(169,69,117,0.1)', alignItems: 'center', justifyContent: 'center' },
  account: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  avatarEmpty: { backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  out: { fontFamily: fonts.button, fontSize: 12, color: colors.muted, letterSpacing: 1 },
});

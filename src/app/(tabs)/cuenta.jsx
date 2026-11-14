import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Display, Eyebrow, Field } from '../../components/ui';
import { useApp } from '../../lib/store';
import { colors, money } from '../../lib/theme';

export default function Account() {
  const insets = useSafeAreaInsets();
  const { myOrders, profile, setProfile } = useApp();
  return <ScrollView style={{ backgroundColor: colors.paper }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
    <View><Eyebrow>SHET BURGER</Eyebrow><Display size={38}>Mis pedidos</Display></View>
    {myOrders.length ? myOrders.map(o => <Pressable key={o.order_number} onPress={() => router.push(`/pedido/${o.order_number}`)} style={({ pressed }) => [pressed && { transform: [{ scale: 0.98 }] }]}>
      <Card style={st.order}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', color: colors.ink }}>#{o.order_number}</Text>
          <Text style={{ fontFamily: 'DMSans_400Regular', color: colors.muted, fontSize: 13 }}>{new Date(o.created_at || Date.now()).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })} · {money(o.total)}</Text>
        </View>
        <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', color: colors.pinkDeep, fontSize: 12 }}>VER ↗</Text>
      </Card>
    </Pressable>) : <Card><Text style={{ fontFamily: 'DMSans_400Regular', color: colors.muted, lineHeight: 20 }}>Aún no haces pedidos desde este celular. Cuando pidas, aquí podrás seguirlos en vivo.</Text></Card>}

    <Card style={{ gap: 12 }}>
      <Eyebrow>Tus datos para pedir más rápido</Eyebrow>
      <Field label="Nombre" value={profile.name} onChangeText={name => setProfile({ ...profile, name })} placeholder="Tu nombre"/>
      <Field label="Celular" prefix="+569" value={profile.phone} onChangeText={t => setProfile({ ...profile, phone: t.replace(/\D/g, '').slice(0, 8) })} keyboardType="number-pad" placeholder="12345678"/>
      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.muted }}>Se guardan solo en este celular.</Text>
    </Card>

    <Pressable onPress={() => router.navigate('/panel')} accessibilityRole="button" style={({ pressed }) => [pressed && { transform: [{ scale: 0.98 }] }]}>
      <Card style={{ backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}><Eyebrow color={colors.pink}>Administración</Eyebrow><Text style={{ color: colors.cream, fontFamily: 'DMSans_500Medium' }}>¿Eres el dueño? Entra al panel de SHET.</Text></View>
        <Text style={{ color: colors.pink, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 12 }}>ENTRAR ↗</Text>
      </Card>
    </Pressable>
  </ScrollView>;
}

const st = StyleSheet.create({ order: { flexDirection: 'row', alignItems: 'center', gap: 12 } });

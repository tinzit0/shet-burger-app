import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../lib/store';
import { colors, fonts } from '../../lib/theme';

// Barra de pestañas propia con el diseño SHET: se ve idéntica en iPhone y Android
// (la barra nativa cambia de forma según el sistema). Sin animación al cambiar de pestaña:
// se usa decenas de veces al día y debe sentirse instantánea.
const TABS = {
  index: { label: 'Inicio', icon: 'home' },
  pedir: { label: 'Pedir', icon: 'fast-food' },
  carrito: { label: 'Pedido', icon: 'bag-handle' },
  cuenta: { label: 'Mis pedidos', icon: 'receipt' },
  panel: { label: 'Panel', icon: 'speedometer' },
};

function ShetTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const { cartCount, adminToken } = useApp();
  return <View style={[st.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
    {state.routes.map((route, index) => {
      const tab = TABS[route.name];
      // El panel solo aparece en la barra cuando el dueño inició sesión.
      if (!tab || (route.name === 'panel' && !adminToken && state.index !== index)) return null;
      const focused = state.index === index;
      const onPress = () => {
        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (!focused && !event.defaultPrevented) { Haptics.selectionAsync().catch(() => {}); navigation.navigate(route.name); }
      };
      return <Pressable key={route.key} onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={route.name === 'carrito' && cartCount ? `${tab.label}, ${cartCount} productos` : tab.label} style={st.item} hitSlop={4}>
        <View style={[st.iconWrap, focused && st.iconOn]}>
          <Ionicons name={focused ? tab.icon : `${tab.icon}-outline`} size={22} color={focused ? colors.ink : colors.nightMuted}/>
          {route.name === 'carrito' && cartCount > 0 && <View style={st.badge}><Text style={st.badgeText}>{cartCount > 99 ? '99+' : cartCount}</Text></View>}
        </View>
        <Text style={[st.label, focused && { color: colors.pink }]} numberOfLines={1}>{tab.label}</Text>
      </Pressable>;
    })}
  </View>;
}

export default function TabsLayout() {
  return <Tabs tabBar={props => <ShetTabBar {...props}/>} screenOptions={{ headerShown: false, animation: 'none', sceneStyle: { backgroundColor: colors.night } }}>
    <Tabs.Screen name="index"/>
    <Tabs.Screen name="pedir"/>
    <Tabs.Screen name="carrito"/>
    <Tabs.Screen name="cuenta"/>
    <Tabs.Screen name="panel"/>
  </Tabs>;
}

const st = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.night, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.cardLine, paddingTop: 8, paddingHorizontal: 6 },
  item: { flex: 1, alignItems: 'center', gap: 3, minHeight: 48 },
  iconWrap: { width: 52, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  iconOn: { backgroundColor: colors.pink },
  label: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.nightMuted },
  badge: { position: 'absolute', top: -4, right: 4, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.pink, borderWidth: 2, borderColor: colors.night, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: fonts.button, fontSize: 10, color: colors.ink },
});

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { ActivityIndicator, View } from 'react-native';
import { AppProvider } from '../lib/store';
import { colors } from '../lib/theme';

export default function RootLayout() {
  // Se carga en tiempo de ejecución para que también funcione en Expo Go.
  const [loaded] = useFonts({ Anton: require('../../assets/fonts/anton-regular.ttf') });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.pink}/></View>;
  return <AppProvider>
    <StatusBar style="dark"/>
    <Stack screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: colors.paper }, headerTintColor: colors.ink, headerTitleStyle: { fontWeight: '800' }, contentStyle: { backgroundColor: colors.paper }, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }}/>
      <Stack.Screen name="producto/[id]" options={{ presentation: 'formSheet', headerShown: false, sheetAllowedDetents: [1], sheetGrabberVisible: true, sheetCornerRadius: 28 }}/>
      <Stack.Screen name="checkout" options={{ title: 'Finalizar pedido' }}/>
      <Stack.Screen name="pedido/[numero]" options={{ title: 'Seguimiento' }}/>
      <Stack.Screen name="admin/index" options={{ title: "Panel SHET" }}/>
    </Stack>
  </AppProvider>;
}

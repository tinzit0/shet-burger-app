import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { ActivityIndicator, View } from 'react-native';
import { AppProvider } from '../lib/store';
import { colors } from '../lib/theme';

export default function RootLayout() {
  // Se carga en tiempo de ejecución para que también funcione en Expo Go.
  const [loaded] = useFonts({
    Anton: require('../../assets/fonts/anton-regular.ttf'),
    DMSans_400Regular, DMSans_500Medium, DMSans_700Bold, SpaceGrotesk_700Bold,
  });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.pink}/></View>;
  return <AppProvider>
    <StatusBar style="auto"/>
    <Stack screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: colors.paper }, headerTintColor: colors.ink, headerTitleStyle: { fontWeight: '800' }, contentStyle: { backgroundColor: colors.paper }, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }}/>
      <Stack.Screen name="producto/[id]" options={{ presentation: 'formSheet', headerShown: false, sheetAllowedDetents: [1], sheetGrabberVisible: true, sheetCornerRadius: 28 }}/>
      <Stack.Screen name="checkout" options={{ title: 'Finalizar pedido' }}/>
      <Stack.Screen name="pedido/[numero]" options={{ title: 'Seguimiento' }}/>
    </Stack>
  </AppProvider>;
}

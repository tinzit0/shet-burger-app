import { NativeTabs } from 'expo-router/native-tabs';
import { useApp } from '../../lib/store';
import { colors } from '../../lib/theme';

// Barra de pestañas nativa: la de iOS en iPhone y la de Material en Android.
export default function TabsLayout() {
  const { cartCount } = useApp();
  return <NativeTabs tintColor={colors.pinkDeep}>
    <NativeTabs.Trigger name="index">
      <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home"/>
      <NativeTabs.Trigger.Label>Inicio</NativeTabs.Trigger.Label>
    </NativeTabs.Trigger>
    <NativeTabs.Trigger name="menu">
      <NativeTabs.Trigger.Icon sf="fork.knife" md="restaurant_menu"/>
      <NativeTabs.Trigger.Label>Menú</NativeTabs.Trigger.Label>
    </NativeTabs.Trigger>
    <NativeTabs.Trigger name="carrito">
      <NativeTabs.Trigger.Icon sf={{ default: 'bag', selected: 'bag.fill' }} md="shopping_bag"/>
      <NativeTabs.Trigger.Label>Pedido</NativeTabs.Trigger.Label>
      {cartCount > 0 && <NativeTabs.Trigger.Badge>{String(cartCount)}</NativeTabs.Trigger.Badge>}
    </NativeTabs.Trigger>
    <NativeTabs.Trigger name="cuenta">
      <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} md="person"/>
      <NativeTabs.Trigger.Label>Mis pedidos</NativeTabs.Trigger.Label>
    </NativeTabs.Trigger>
  </NativeTabs>;
}

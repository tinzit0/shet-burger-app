import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { loadCatalog, loadStore, loadZones, subscribe } from './api';
import { DELIVERY_ZONES } from '../shared/delivery.js';
import { customizationTotal, customizationUnavailable, priceValue } from '../shared/customization.js';

const Ctx = createContext(null);
const read = async (key, fallback) => { try { const v = await AsyncStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
const write = (key, value) => AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {});

export function AppProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [stock, setStock] = useState({});
  const [storeOpen, setStoreOpen] = useState(true);
  const [zones, setZones] = useState(DELIVERY_ZONES);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [cart, setCart] = useState([]);
  const [myOrders, setMyOrders] = useState([]); // números de pedido hechos desde este celular
  const [profile, setProfile] = useState({ name: '', phone: '' });
  const [adminToken, setAdminToken] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [catalog, store, deliveryZones] = await Promise.all([loadCatalog(), loadStore(), loadZones()]);
      setProducts(catalog); setStock(store.stock); setStoreOpen(store.storeOpen); setZones(deliveryZones); setStatus('ready');
    } catch { setStatus(current => (current === 'ready' ? 'ready' : 'error')); }
  }, []);

  useEffect(() => {
    (async () => {
      const [c, o, p, t] = await Promise.all([read('shet-cart', []), read('shet-my-orders', []), read('shet-profile', { name: '', phone: '' }), read('shet-admin-token', null)]);
      setCart(c); setMyOrders(o); setProfile(p); setAdminToken(t); setHydrated(true);
    })();
    refresh();
    // Web y app comparten la misma base: cualquier cambio hecho en una aparece en la otra.
    // En vivo: tienda abierta/cerrada, stock, menú y zonas de despacho.
    const offs = [
      subscribe('store_settings', refresh),
      subscribe('product_availability', refresh),
      subscribe('shet_catalog_products', refresh),
      subscribe('delivery_zones', refresh),
    ];
    // Respaldo: al volver a abrir la app y cada minuto, por si el aviso en vivo se cortó.
    const appState = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    const timer = setInterval(refresh, 60000);
    return () => { offs.forEach(off => off()); appState.remove(); clearInterval(timer); };
  }, [refresh]);

  useEffect(() => { if (hydrated) write('shet-cart', cart); }, [cart, hydrated]);
  useEffect(() => { if (hydrated) write('shet-my-orders', myOrders); }, [myOrders, hydrated]);
  useEffect(() => { if (hydrated) write('shet-profile', profile); }, [profile, hydrated]);
  useEffect(() => { if (hydrated) write('shet-admin-token', adminToken); }, [adminToken, hydrated]);

  // Igual que add() de la web: el precio unitario incluye extras y mejoras.
  const addToCart = useCallback((product, variant, customization = {}) => {
    if (!storeOpen) return 'La tienda está cerrada.';
    if (stock[product.id] === false) return `${product.name} está agotado.`;
    if (customizationUnavailable(customization, stock, products)) return 'Un adicional seleccionado se agotó.';
    const quantity = Math.min(25, Math.max(1, Number(customization.quantity) || 1));
    const selected = { label: variant[0], price: priceValue(variant[1]) + customizationTotal(customization) };
    const normalized = {
      extras: customization.extras || [], friesExtras: customization.friesExtras || [], burgers: customization.burgers || [],
      drinkChoiceIds: customization.drinkChoiceIds || [], note: (customization.note || '').trim(),
      burgerChoices: customization.burgerChoices || [], burgerChoiceIds: customization.burgerChoiceIds || [],
      selections: [...(customization.selections || []), ...(['extras', 'salsas'].includes(product.category) ? [{ label: 'Entrega', value: 'Extra independiente: enviar por separado' }] : [])],
    };
    const key = `${product.id}-${selected.label}-${JSON.stringify(normalized)}`;
    setCart(items => {
      const found = items.find(item => item.key === key);
      return found ? items.map(item => item.key === key ? { ...item, quantity: Math.min(25, item.quantity + quantity) } : item)
        : [...items, { key, product, variant: selected, quantity, customization: normalized }];
    });
    return null;
  }, [storeOpen, stock, products]);

  const setQuantity = useCallback((key, quantity) => setCart(items => quantity <= 0 ? items.filter(i => i.key !== key) : items.map(i => i.key === key ? { ...i, quantity: Math.min(25, quantity) } : i)), []);
  const clearCart = useCallback(() => setCart([]), []);
  const rememberOrder = useCallback(order => setMyOrders(list => [{ order_number: order.order_number, created_at: order.created_at, total: order.total }, ...list.filter(o => o.order_number !== order.order_number)].slice(0, 30)), []);

  const value = useMemo(() => ({
    products, stock, storeOpen, zones, status, refresh, cart, addToCart, setQuantity, clearCart,
    cartCount: cart.reduce((s, i) => s + i.quantity, 0), cartSubtotal: cart.reduce((s, i) => s + i.variant.price * i.quantity, 0),
    myOrders, rememberOrder, profile, setProfile, adminToken, setAdminToken, hydrated,
  }), [products, stock, storeOpen, zones, status, refresh, cart, addToCart, setQuantity, clearCart, myOrders, rememberOrder, profile, adminToken, hydrated]);
  return createElement(Ctx.Provider, { value }, children);
}

export const useApp = () => useContext(Ctx);

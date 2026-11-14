// Identidad SHET: mismos colores que la web (src/design/tokens de shet-burger).
export const colors = {
  ink: '#09090b',
  graphite: '#151317',
  bone: '#f7f1ed',
  paper: '#f4efec',
  cream: '#fff9ff',
  pink: '#f09bc4',
  pinkDeep: '#a94575',
  gold: '#d6a83d',
  muted: '#686168',
  mutedLight: '#bbb2b8',
  line: 'rgba(9,9,11,0.12)',
  white: '#ffffff',
  good: '#257043',
  goodBg: '#e3f3e5',
  late: '#b42318',
  lateBg: '#fdecea',
  warnBg: '#fff6e0',
  warn: '#6b4a0f',
  // Carta e inicio oscuros, como la web en el celular.
  night: '#0b0a0c',
  card: '#1a181b',
  cardLine: 'rgba(255,249,255,0.12)',
  nightMuted: '#b9b0b6',
  whatsapp: '#25d366',
};

// Mismas familias que la web: Anton (títulos), Space Grotesk (botones), DM Sans (texto).
export const fonts = {
  display: 'Anton',
  button: 'SpaceGrotesk_700Bold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodyBold: 'DMSans_700Bold',
};

export const WHATSAPP_URL = 'https://wa.me/56956901911?text=Hola%2C%20quiero%20hacer%20una%20consulta';
export const OPENING_TIME = process.env.EXPO_PUBLIC_OPENING_TIME || '18:00';

export const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL || 'https://shet-burger.concepcion.workers.dev';

// Las fotos del menú viven en la web; la app las descarga y expo-image las guarda en caché.
export const imageUrl = path => (!path ? null : /^https?:/.test(path) ? path : `${SITE_URL}${path.startsWith('/') ? '' : '/'}${encodeURI(path)}`);

export const money = value => `$${Math.round(Number(value || 0)).toLocaleString('es-CL')}`;

export const business = {
  name: process.env.EXPO_PUBLIC_BUSINESS_NAME || 'SHET BURGER SpA',
  bank: process.env.EXPO_PUBLIC_BANK_NAME || 'Banco Estado',
  account: process.env.EXPO_PUBLIC_BANK_ACCOUNT || 'Cuenta por configurar',
  rut: process.env.EXPO_PUBLIC_BUSINESS_RUT || 'RUT por configurar',
  pickupAddress: process.env.EXPO_PUBLIC_PICKUP_ADDRESS || 'Río Loa 130, Nonguén, Concepción, Chile',
  instagram: 'https://www.instagram.com/shetburger/',
};

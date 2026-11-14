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
};

export const fonts = {
  display: 'Anton', // assets/fonts/anton-regular.ttf, cargada con el plugin expo-font
};

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

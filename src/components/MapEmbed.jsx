import { WebView } from 'react-native-webview';

// Mismo mapa de Google que la web (pickupMapEmbedUrl), dentro de la app.
export default function MapEmbed({ address, style }) {
  const src = `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
  const html = `<html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>html,body,iframe{margin:0;padding:0;border:0;width:100%;height:100%;background:#0b0a0c}</style></head><body><iframe src="${src}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></body></html>`;
  return <WebView source={{ html, baseUrl: 'https://www.google.com' }} style={[{ backgroundColor: '#0b0a0c' }, style]} scrollEnabled={false} originWhitelist={['*']} setSupportMultipleWindows={false} androidLayerType="hardware"/>;
}

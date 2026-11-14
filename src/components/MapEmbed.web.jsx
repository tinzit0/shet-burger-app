import { createElement } from 'react';
import { View } from 'react-native';

// En la vista web (VS Code / navegador) el mapa es un iframe, igual que la página.
export default function MapEmbed({ address, style }) {
  const src = `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
  return <View style={style}>{createElement('iframe', { src, title: 'Mapa SHET Burger', loading: 'lazy', style: { border: 0, width: '100%', height: '100%' } })}</View>;
}

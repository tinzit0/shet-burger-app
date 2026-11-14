import { createElement, useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { deliveryMapHtml } from './deliveryMapHtml';

// Vista web (VS Code / navegador): el mismo mapa en un iframe.
export default function DeliveryMap({ zones, point, activeZoneId, onPick, style }) {
  const ref = useRef(null), ready = useRef(false), pick = useRef(onPick);
  pick.current = onPick;
  const html = useMemo(() => deliveryMapHtml({ zones, point, activeZoneId }), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const listen = e => { if (e.source !== ref.current?.contentWindow) return; try { const m = JSON.parse(e.data); if (m.type === 'ready') ready.current = true; if (m.type === 'pick') pick.current?.(m.point); } catch {} };
    window.addEventListener('message', listen);
    return () => window.removeEventListener('message', listen);
  }, []);
  useEffect(() => {
    if (ready.current) ref.current?.contentWindow?.postMessage(JSON.stringify({ __shet: true, zones, point: point || null, activeZoneId: activeZoneId || null }), '*');
  }, [zones, point, activeZoneId]);
  return <View style={style}>{createElement('iframe', { ref, srcDoc: html, title: 'Mapa de zonas de despacho', style: { border: 0, width: '100%', height: '100%' } })}</View>;
}

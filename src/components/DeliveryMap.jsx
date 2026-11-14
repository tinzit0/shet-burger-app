import { useEffect, useMemo, useRef } from 'react';
import { WebView } from 'react-native-webview';
import { deliveryMapHtml } from './deliveryMapHtml';

// iPhone / Android: el mapa de despacho de la web dentro de un WebView.
export default function DeliveryMap({ zones, point, activeZoneId, onPick, style, readOnly = false }) {
  const ref = useRef(null), ready = useRef(false);
  // El HTML se arma una sola vez; los cambios se envían al mapa sin recargarlo.
  const html = useMemo(() => deliveryMapHtml({ zones, point, activeZoneId, readOnly }), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!ready.current) return;
    ref.current?.injectJavaScript(`window.__shet(${JSON.stringify({ zones, point: point || null, activeZoneId: activeZoneId || null })});true;`);
  }, [zones, point, activeZoneId]);
  return <WebView ref={ref} source={{ html, baseUrl: 'https://shet-burger.concepcion.workers.dev' }} originWhitelist={['*']} style={style}
    nestedScrollEnabled scrollEnabled={false} setSupportMultipleWindows={false}
    onMessage={e => { try { const m = JSON.parse(e.nativeEvent.data); if (m.type === 'ready') ready.current = true; if (m.type === 'pick') onPick?.(m.point); } catch {} }}/>;
}

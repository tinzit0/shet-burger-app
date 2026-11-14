# SHET BURGER · App

App nativa para **Android y iPhone** hecha con Expo (SDK 58). Usa la misma base de datos Supabase que la página web, así que menú, stock, tienda abierta/cerrada, cupones y pedidos están siempre sincronizados.

## Ver la app mientras se desarrolla

- **En VS Code:** `Ctrl+Shift+B` (tarea "Ver app en el navegador de VS Code") y luego `Ctrl+Shift+P` → *Simple Browser: Show* → `http://localhost:8081`.
- **En el celular:** instala **Expo Go**, ejecuta `npx expo start` y escanea el QR (mismo Wi-Fi; si no conecta, `npx expo start --tunnel`).

## Qué incluye

- **Clientes:** inicio, menú por categorías, armado de hamburguesas y promos (extras, papas, bebidas), carrito, checkout con "Usar mi ubicación" y cálculo de despacho por zonas, cupones, datos de transferencia y comprobante, seguimiento del pedido en vivo y "Mis pedidos".
- **Dueño** (Mis pedidos → *Soy el dueño*): mismo usuario del panel web. Pedidos con aviso sonoro y vibración, cocina con atrasos, resumen del día, stock, abrir/cerrar tienda y pausar cupones.

## Lógica compartida con la web

`src/shared/` se genera desde `../shet-burger/src/lib` (cupones, delivery, estados, precios). Si cambias esos archivos en la web, ejecuta:

```
npm run sync-shared
```

## Publicar en las tiendas

Se compila en la nube con EAS (no necesitas Mac para Android; para iPhone tampoco hace falta Mac con EAS):

```
npx eas-cli@latest build --platform android
npx eas-cli@latest build --platform ios
```

Requiere cuenta de Expo, y para publicar: Google Play (US$25 una vez) y Apple Developer (US$99/año).

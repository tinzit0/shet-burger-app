// Mismo mapa de despacho que la web (DeliveryMap.jsx): Leaflet + OpenStreetMap en gris,
// zonas de colores con su tarifa, logo SHET en el local y un pin que se toca o arrastra.
// Se dibuja dentro de un WebView (iPhone/Android) o un iframe (vista web).
import { imageUrl } from '../lib/theme';

export const SHOP_POINT = [-36.83088, -73.00707];

export function deliveryMapHtml({ zones, point, activeZoneId }) {
  const data = JSON.stringify({ zones, point, activeZoneId, logo: imageUrl('/assets/logo shet burger.png'), shop: SHOP_POINT });
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
html,body,#map{margin:0;height:100%;background:#e9e6e4}
.tiles{filter:grayscale(.85) contrast(.95) brightness(1.04)}
.pin{background:none;border:0}.pin svg{width:32px;height:44px;filter:drop-shadow(0 4px 6px rgba(0,0,0,.35))}
.pin path{fill:#EC3478;stroke:#0a0a0a;stroke-width:2}.pin circle{fill:#fff}
.shop{background:none;border:0}.shop img{width:38px;height:38px;border:2px solid #0a0a0a;border-radius:50%;background:#f09ac4;box-shadow:0 3px 8px rgba(0,0,0,.3)}
.leaflet-tooltip{font:600 12px system-ui,sans-serif}
</style></head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var S=${data}, map, zonesLayer, pin, fitted=false, lastUser=null;
function send(m){var t=JSON.stringify(m);if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(t);else if(window.parent)window.parent.postMessage(t,'*');}
function money(v){return '$'+Number(v||0).toLocaleString('es-CL');}
function drawZones(){
  if(zonesLayer)zonesLayer.remove();
  zonesLayer=L.featureGroup(S.zones.filter(function(z){return z.active!==false}).map(function(z){
    var on=z.id===S.activeZoneId;
    return L.polygon(z.polygon,{color:z.color,weight:on?3:2,fillColor:z.color,fillOpacity:on?.28:.12}).bindTooltip(z.label+' · '+money(z.fee),{sticky:true,direction:'top'});
  })).addTo(map);
  if(!fitted&&zonesLayer.getLayers().length){map.fitBounds(zonesLayer.getBounds(),{padding:[12,12]});fitted=true;}
}
function drawPin(user){
  if(!S.point){if(pin){pin.remove();pin=null;}return;}
  if(!pin){
    pin=L.marker(S.point,{draggable:true,autoPan:true,icon:L.divIcon({className:'pin',html:'<svg viewBox="0 0 32 44"><path d="M16 1C7.7 1 1 7.6 1 15.8 1 27 16 43 16 43s15-16 15-27.2C31 7.6 24.3 1 16 1z"/><circle cx="16" cy="16" r="6"/></svg>',iconSize:[32,44],iconAnchor:[16,43]})})
      .on('dragend',function(e){var p=e.target.getLatLng();lastUser=[p.lat,p.lng];send({type:'pick',point:lastUser});}).addTo(map);
  } else pin.setLatLng(S.point);
  if(!user)map.setView(S.point,Math.max(map.getZoom(),16),{animate:false});
  else if(map.getZoom()<15)map.setView(S.point,16,{animate:false});
}
window.__shet=function(m){
  if(m.zones){S.zones=m.zones;}
  if('activeZoneId' in m)S.activeZoneId=m.activeZoneId;
  drawZones();
  if('point' in m){var user=lastUser&&m.point&&lastUser[0]===m.point[0]&&lastUser[1]===m.point[1];S.point=m.point;drawPin(user);}
};
window.addEventListener('message',function(e){try{var m=typeof e.data==='string'?JSON.parse(e.data):e.data;if(m&&m.__shet)window.__shet(m);}catch(_){}});
map=L.map('map',{zoomControl:true,attributionControl:true,tap:true}).setView(S.shop,13);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap',maxZoom:19,className:'tiles'}).addTo(map);
L.marker(S.shop,{interactive:false,icon:L.divIcon({className:'shop',html:'<img src="'+S.logo+'" alt="">',iconSize:[38,38],iconAnchor:[19,19]})}).addTo(map);
map.on('click',function(e){lastUser=[e.latlng.lat,e.latlng.lng];send({type:'pick',point:lastUser});});
drawZones();drawPin(false);send({type:'ready'});
</script></body></html>`;
}

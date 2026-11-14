// Copia la lógica pura de la web (../shet-burger/src/lib) a src/shared.
// Así la app calcula cupones, zonas de delivery, estados y precios igual que la página.
// Ejecutar después de cambiar esos archivos en la web: npm run sync-shared
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const web = process.env.SHET_WEB_DIR || join(root, '..', 'shet-burger');
const files = ['bestSellers.js', 'couponRules.js', 'orderStatus.js', 'delivery.js', 'geo.js', 'customization.js', 'insights.js', 'addressLookup.js'];

await mkdir(join(root, 'src/shared'), { recursive: true });
for (const file of files) {
  let code = await readFile(join(web, 'src/lib', file), 'utf8');
  // Metro no entiende import.meta.env: las variables VITE_* pasan a EXPO_PUBLIC_*.
  code = code.replace(/import\.meta\.env\??\.VITE_/g, 'process.env.EXPO_PUBLIC_');
  code = code.replace(/from '\.\/([a-zA-Z]+)'/g, "from './$1.js'");
  const header = `// GENERADO desde shet-burger/src/lib/${file} por scripts/sync-shared.mjs. No editar aquí.\n`;
  await writeFile(join(root, 'src/shared', file), header + code);
  console.log('ok', file);
}

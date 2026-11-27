import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { INITIAL_HAIRSTYLES } from '../public/js/data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const requiredFiles = [
  'public/index.html',
  'public/manifest.webmanifest',
  'public/sw.js',
  'public/css/styles.css',
  'public/js/app.js',
  'public/js/data.js',
  'public/js/store.js',
  'public/js/flyer.js',
  'public/images/nicole-logo.jpg',
  'public/images/price-menu-card.jpg',
  'public/icons/icon-192.png',
  'public/icons/icon-512.png',
  'public/icons/apple-touch-icon.png',
  'capacitor.config.json',
  'server.js',
  'api/index.js'
];

for (const rel of requiredFiles) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    throw new Error(`Missing required build asset: ${rel}`);
  }
}

for (const style of INITIAL_HAIRSTYLES) {
  const imgRel = path.join('public', style.image.replace(/^\//, ''));
  if (!fs.existsSync(path.join(root, imgRel))) {
    throw new Error(`Missing hairstyle image for ${style.id}: ${imgRel}`);
  }
}

console.log(`✓ Verified ${requiredFiles.length} core files and ${INITIAL_HAIRSTYLES.length} hairstyle photos.`);

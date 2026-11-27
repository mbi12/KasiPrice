// HTML5 Canvas Branded Promo Flyer & Image Compression Utilities
import { SALON_INFO } from './data.js';

export function compressImageFile(file, maxEdge = 960, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image format'));
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function loadImg(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
  const words = String(text || '').split(/\s+/);
  let line = '';
  let lines = 0;
  let curY = y;

  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, curY);
      line = words[i];
      curY += lineHeight;
      lines++;
      if (lines >= maxLines - 1) {
        const rest = [line, ...words.slice(i + 1)].join(' ');
        ctx.fillText(rest.length > 42 ? `${rest.slice(0, 39)}...` : rest, x, curY);
        return curY + lineHeight;
      }
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, curY);
    curY += lineHeight;
  }
  return curY;
}

export async function renderPromoFlyerBlob(promo) {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Rich luxury gradient backdrop
  const grad = ctx.createLinearGradient(0, 0, W, H);
  if (promo.theme === 'berry-velvet') {
    grad.addColorStop(0, '#2B0A1F');
    grad.addColorStop(0.55, '#59153E');
    grad.addColorStop(1, '#120818');
  } else if (promo.theme === 'obsidian-gold') {
    grad.addColorStop(0, '#091224');
    grad.addColorStop(0.55, '#13274A');
    grad.addColorStop(1, '#070D19');
  } else {
    grad.addColorStop(0, '#081B36');
    grad.addColorStop(0.5, '#0F386E');
    grad.addColorStop(1, '#071428');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Decorative glow orbs
  const orb = ctx.createRadialGradient(880, 220, 20, 880, 220, 420);
  orb.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
  orb.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = orb;
  ctx.fillRect(0, 0, W, H);

  // Top Header Pill with Logo
  const logoImg = await loadImg(SALON_INFO.logo);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.beginPath();
  ctx.roundRect(70, 58, W - 140, 148, 36);
  ctx.fill();

  if (logoImg) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(96, 74, 180, 116, 20);
    ctx.clip();
    ctx.drawImage(logoImg, 96, 74, 180, 116);
    ctx.restore();
  }

  ctx.fillStyle = '#091830';
  ctx.font = '800 38px sans-serif';
  ctx.fillText('NICOLE BEAUTY PARLOUR', 300, 124);
  ctx.fillStyle = '#0284C7';
  ctx.font = '600 26px sans-serif';
  ctx.fillText('Look Good  💙  Feel Good  💙  Be You', 300, 168);

  // Center Hairstyle Portrait Card
  const styleImg = await loadImg(promo.image || '/images/style-01-honey-curly-knotless.jpg');
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(70, 238, W - 140, 620, 42);
  ctx.clip();
  if (styleImg) {
    const scale = Math.max((W - 140) / styleImg.width, 620 / styleImg.height);
    const dw = styleImg.width * scale;
    const dh = styleImg.height * scale;
    const dx = 70 + (W - 140 - dw) / 2;
    const dy = 238 + (620 - dh) / 2;
    ctx.drawImage(styleImg, dx, dy, dw, dh);
  } else {
    ctx.fillStyle = '#1E3A5F';
    ctx.fillRect(70, 238, W - 140, 620);
  }
  ctx.restore();

  // Discount Ribbon Badge
  ctx.fillStyle = '#F59E0B';
  ctx.beginPath();
  ctx.roundRect(104, 272, 280, 74, 37);
  ctx.fill();
  ctx.fillStyle = '#091322';
  ctx.font = '900 32px sans-serif';
  ctx.fillText(`${promo.discountPercent}% OFF DEAL`, 136, 320);

  // Offer Copy Card
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(70, 890, W - 140, 290, 36);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#38BDF8';
  ctx.font = '800 26px sans-serif';
  ctx.fillText(`PROMO CODE: ${promo.code}   •   ${promo.priceHighlight || 'SPECIAL BWP RATE'}`, 110, 948);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 50px sans-serif';
  ctx.fillText(String(promo.title).slice(0, 32), 110, 1016);

  ctx.fillStyle = 'rgba(235, 245, 255, 0.88)';
  ctx.font = '500 30px sans-serif';
  wrapText(ctx, promo.subtitle, 110, 1072, W - 220, 40, 2);

  // Footer Call-to-Action Bar
  ctx.fillStyle = '#38BDF8';
  ctx.beginPath();
  ctx.roundRect(70, 1208, W - 140, 92, 30);
  ctx.fill();

  ctx.fillStyle = '#06152B';
  ctx.font = '900 32px sans-serif';
  ctx.fillText(`📞 Book / WhatsApp: ${SALON_INFO.phoneRaw}   •   ${SALON_INFO.instagram}`, 114, 1265);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve({ blob, dataUrl: canvas.toDataURL('image/png') }), 'image/png');
  });
}

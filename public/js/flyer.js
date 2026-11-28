// Couture Branded Poster & VIP Pass Canvas Renderer (100% Exact Nicole Beauty Parlour Palette)
import { SALON_INFO } from './data.js';

export function compressImageFile(file, maxEdge = 960, quality = 0.84) {
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

function drawCoverImage(ctx, img, x, y, w, h) {
  if (!img) return;
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
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
        ctx.fillText(rest.length > 44 ? `${rest.slice(0, 41)}...` : rest, x, curY);
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

export async function renderPromoFlyerToCanvas(canvas, promo) {
  const W = 1080;
  const H = 1350;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const isLightTheme = promo.theme === 'ice-pearl';
  const isEditorial = promo.theme === 'editorial-sky';

  // 1. Couture Backdrop strictly in Nicole Beauty Parlour palette (#29ABE2, #DFF3FE, #FFFFFF, #040B16)
  const bg = ctx.createLinearGradient(0, 0, W, H);
  if (isLightTheme) {
    bg.addColorStop(0, '#DFF3FE');
    bg.addColorStop(0.5, '#F7FCFF');
    bg.addColorStop(1, '#D7EFFD');
  } else if (isEditorial) {
    bg.addColorStop(0, '#071B34');
    bg.addColorStop(0.55, '#0C3B66');
    bg.addColorStop(1, '#040C1A');
  } else {
    bg.addColorStop(0, '#040914');
    bg.addColorStop(0.55, '#09182E');
    bg.addColorStop(1, '#030710');
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Ambient Sky-Cyan Silk Glow (#29ABE2)
  const glow1 = ctx.createRadialGradient(W * 0.82, 220, 10, W * 0.82, 220, 480);
  glow1.addColorStop(0, isLightTheme ? 'rgba(41, 171, 226, 0.28)' : 'rgba(41, 171, 226, 0.42)');
  glow1.addColorStop(1, 'rgba(41, 171, 226, 0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, W, H);

  const glow2 = ctx.createRadialGradient(180, H - 180, 10, 180, H - 180, 440);
  glow2.addColorStop(0, isLightTheme ? 'rgba(11, 123, 193, 0.18)' : 'rgba(56, 189, 248, 0.25)');
  glow2.addColorStop(1, 'rgba(41, 171, 226, 0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  // Subtle Couture Outer Frame
  ctx.strokeStyle = isLightTheme ? 'rgba(41, 171, 226, 0.45)' : 'rgba(41, 171, 226, 0.38)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(38, 38, W - 76, H - 76, 44);
  ctx.stroke();

  // 2. Transparent Master Logo at Top Center (NO rectangular white screenshot box!)
  const logoSrc = isLightTheme ? SALON_INFO.logoDarkInk : SALON_INFO.logoLightInk;
  const logoImg = await loadImg(logoSrc);
  if (logoImg) {
    const targetW = 470;
    const targetH = (logoImg.height / logoImg.width) * targetW;
    ctx.drawImage(logoImg, (W - targetW) / 2, 64, targetW, targetH);
  }

  // 3. Featured Hairstyle Editorial Frame
  const styleImg = await loadImg(promo.image || '');
  const cardX = 78;
  const cardY = 345;
  const cardW = W - 156;
  const cardH = 565;

  ctx.save();
  ctx.shadowColor = isLightTheme ? 'rgba(8, 22, 46, 0.18)' : 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 44;
  ctx.shadowOffsetY = 18;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 38);
  ctx.fillStyle = '#0A1628';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 38);
  ctx.clip();
  drawCoverImage(ctx, styleImg, cardX, cardY, cardW, cardH);

  const imgShade = ctx.createLinearGradient(0, cardY + cardH * 0.42, 0, cardY + cardH);
  imgShade.addColorStop(0, 'rgba(4, 10, 20, 0)');
  imgShade.addColorStop(1, 'rgba(4, 10, 20, 0.86)');
  ctx.fillStyle = imgShade;
  ctx.fillRect(cardX, cardY, cardW, cardH);
  ctx.restore();

  // Frame border
  ctx.strokeStyle = 'rgba(41, 171, 226, 0.65)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 38);
  ctx.stroke();

  // Top-left Campaign Pill
  ctx.fillStyle = '#29ABE2';
  ctx.beginPath();
  ctx.roundRect(cardX + 28, cardY + 28, 310, 56, 28);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(String(promo.badge || 'LIMITED PARLOUR OFFER').toUpperCase(), cardX + 52, cardY + 64);

  // Discount Seal on Top-Right
  ctx.save();
  ctx.fillStyle = '#050B16';
  ctx.beginPath();
  ctx.arc(cardX + cardW - 92, cardY + 92, 68, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#29ABE2';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = '#29ABE2';
  ctx.textAlign = 'center';
  ctx.font = '800 38px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`${promo.discountPercent || 15}%`, cardX + cardW - 92, cardY + 90);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('OFF', cardX + cardW - 92, cardY + 118);
  ctx.restore();

  // Price Highlight Pill inside bottom of photo
  ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
  ctx.beginPath();
  ctx.roundRect(cardX + 28, cardY + cardH - 96, 280, 66, 33);
  ctx.fill();
  ctx.fillStyle = '#050B16';
  ctx.font = '800 32px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(promo.priceHighlight || 'From P130', cardX + 56, cardY + cardH - 52);

  // Promo Code Pill on bottom-right of photo
  ctx.fillStyle = 'rgba(41, 171, 226, 0.95)';
  ctx.beginPath();
  ctx.roundRect(cardX + cardW - 338, cardY + cardH - 96, 310, 66, 33);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 26px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`CODE: ${promo.code || ''}`, cardX + cardW - 308, cardY + cardH - 54);

  // 4. Campaign Copy Block
  ctx.fillStyle = isLightTheme ? '#050B16' : '#FFFFFF';
  ctx.font = '800 54px "Plus Jakarta Sans", sans-serif';
  const nextY = wrapText(ctx, promo.title || 'Signature Parlour Offer', 82, 992, W - 164, 62, 2);

  ctx.fillStyle = isLightTheme ? '#274263' : '#B9D9EE';
  ctx.font = '500 30px "Plus Jakarta Sans", sans-serif';
  wrapText(ctx, promo.subtitle || 'Pain-free Knotless, Box Braids, Twists & Softdread.', 82, nextY + 12, W - 164, 42, 2);

  // 5. Bottom Booking Bar
  ctx.fillStyle = isLightTheme ? '#050B16' : 'rgba(41, 171, 226, 0.16)';
  ctx.beginPath();
  ctx.roundRect(78, H - 156, W - 156, 92, 46);
  ctx.fill();
  if (!isLightTheme) {
    ctx.strokeStyle = 'rgba(41, 171, 226, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.fillStyle = '#29ABE2';
  ctx.font = '800 27px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`BOOK & WHATSAPP: ${SALON_INFO.phoneDisplay}`, 116, H - 101);

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'right';
  ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(SALON_INFO.instagram, W - 116, H - 102);
  ctx.textAlign = 'left';
}

export async function renderPromoFlyerBlob(promo) {
  const canvas = document.createElement('canvas');
  await renderPromoFlyerToCanvas(canvas, promo);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 0.95);
  });
}

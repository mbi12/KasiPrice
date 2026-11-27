import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SALON_INFO,
  OFFICIAL_PRICE_MATRIX,
  INITIAL_HAIRSTYLES,
  INITIAL_PROMOTIONS,
  INITIAL_BOOKINGS,
  INITIAL_THREADS,
  calculateStylePrice
} from './public/js/data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'runtime-db.json');

const DEFAULT_ADMIN_PHONE = process.env.ADMIN_PHONE || '72517904';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Nicole2026';
const TOKEN_SECRET =
  process.env.ADMIN_TOKEN_SECRET || 'nbp-couture-hmac-secret-26772517904-v2';

export function normalizePhone(raw = '') {
  const digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('267') && digits.length > 8) {
    return digits.slice(3);
  }
  if (digits.startsWith('0') && digits.length > 8) {
    return digits.slice(1);
  }
  return digits;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, keyHex] = storedHash.split(':');
  const derived = crypto.scryptSync(String(password), salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

function signAdminToken(phone) {
  const payload = Buffer.from(
    JSON.stringify({
      phone: normalizePhone(phone),
      role: 'owner',
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000
    })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyAdminToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  if (sig !== expected) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!parsed || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function createInitialDb() {
  return {
    admin: {
      phone: normalizePhone(DEFAULT_ADMIN_PHONE),
      displayPhone: SALON_INFO.phoneDisplay,
      name: '',
      passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
      updatedAt: new Date().toISOString()
    },
    styles: structuredClone(INITIAL_HAIRSTYLES),
    promotions: structuredClone(INITIAL_PROMOTIONS),
    bookings: structuredClone(INITIAL_BOOKINGS),
    threads: structuredClone(INITIAL_THREADS)
  };
}

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      if (parsed && Array.isArray(parsed.styles)) {
        if (!parsed.admin || !parsed.admin.passwordHash) {
          parsed.admin = createInitialDb().admin;
        }
        return parsed;
      }
    }
  } catch {
    // Fall back to fresh initial state
  }
  return createInitialDb();
}

let db = loadDb();

function saveDb() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch {
    // Read-only serverless filesystem keeps in-memory state gracefully
  }
}

function publicStatePayload() {
  return {
    styles: db.styles,
    promotions: db.promotions,
    bookings: db.bookings,
    threads: db.threads
  };
}

export function generateSmartSalonReply(userText = '', context = {}) {
  // Demo/mockup replies have been cleared. Return a neutral acknowledgment.
  if (context.styleName) {
    return `Thanks for your interest in "${context.styleName}". Add your braid details and tap Reserve to book your chair.`;
  }
  return 'Thanks for your message! Add your salon details and we will be happy to help you book your chair.';
}

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '12mb' }));

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      salon: SALON_INFO.name,
      tagline: SALON_INFO.tagline,
      phone: SALON_INFO.phoneDisplay,
      stylesCount: db.styles.length,
      promotionsCount: db.promotions.length,
      bookingsCount: db.bookings.length
    });
  });

  /* ================= ADMIN AUTHENTICATION ENDPOINTS ================= */
  app.post('/api/admin/login', (req, res) => {
    const { phone, password } = req.body || {};
    const normalizedInput = normalizePhone(phone);
    if (!normalizedInput || !password) {
      return res.status(400).json({ error: 'Phone number and password are required.' });
    }

    const expectedPhone = normalizePhone(db.admin?.phone || DEFAULT_ADMIN_PHONE);
    const passwordOk = verifyPassword(password, db.admin?.passwordHash);

    if (normalizedInput !== expectedPhone || !passwordOk) {
      return res.status(401).json({ error: 'Invalid admin phone number or password.' });
    }

    const token = signAdminToken(expectedPhone);
    return res.json({
      ok: true,
      token,
      admin: {
        name: db.admin?.name || '',
        phone: expectedPhone,
        displayPhone: `+267 ${expectedPhone}`
      }
    });
  });

  app.get('/api/admin/session', (req, res) => {
    const authHeader = String(req.headers.authorization || '');
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const decoded = verifyAdminToken(token);
    if (!decoded) {
      return res.status(401).json({ authenticated: false });
    }
    return res.json({
      authenticated: true,
      admin: {
        name: db.admin?.name || '',
        phone: decoded.phone,
        displayPhone: `+267 ${decoded.phone}`
      }
    });
  });

  app.patch('/api/admin/credentials', (req, res) => {
    const authHeader = String(req.headers.authorization || '');
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const decoded = verifyAdminToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Admin authentication required.' });
    }

    const { currentPassword, newPhone, newPassword, ownerName } = req.body || {};
    if (!currentPassword || !verifyPassword(currentPassword, db.admin?.passwordHash)) {
      return res.status(403).json({ error: 'Current password is incorrect.' });
    }

    if (newPhone && normalizePhone(newPhone).length >= 7) {
      db.admin.phone = normalizePhone(newPhone);
      db.admin.displayPhone = `+267 ${db.admin.phone}`;
    }
    if (newPassword) {
      if (String(newPassword).length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters.' });
      }
      db.admin.passwordHash = hashPassword(newPassword);
    }
    if (ownerName && String(ownerName).trim()) {
      db.admin.name = String(ownerName).trim();
    }
    db.admin.updatedAt = new Date().toISOString();
    saveDb();

    const freshToken = signAdminToken(db.admin.phone);
    return res.json({
      ok: true,
      token: freshToken,
      admin: {
        name: db.admin.name,
        phone: db.admin.phone,
        displayPhone: db.admin.displayPhone
      }
    });
  });

  /* ================= CATALOG, PROMOTIONS, BOOKINGS & CHAT ================= */
  app.get('/api/pricing', (_req, res) => {
    res.json({
      currency: SALON_INFO.currency,
      matrix: OFFICIAL_PRICE_MATRIX,
      specialtyFlat: 250
    });
  });

  app.get('/api/state', (_req, res) => {
    res.json(publicStatePayload());
  });

  app.post('/api/styles', (req, res) => {
    const body = req.body || {};
    if (!body.name || !String(body.name).trim()) {
      return res.status(400).json({ error: 'Style name is required' });
    }

    const newStyle = {
      id: body.id || `style-custom-${Date.now()}`,
      name: String(body.name).trim(),
      category: body.category || '',
      image: body.image || '',
      defaultSize: body.defaultSize || 'medium',
      defaultLength: body.defaultLength || 'midback',
      pricingMode: body.pricingMode === 'flat' ? 'flat' : 'matrix',
      flatPrice: Number(body.flatPrice || 250),
      priceOffset: Number(body.priceOffset || 0),
      rating: Number(body.rating || 5.0),
      reviewsCount: Number(body.reviewsCount || 1),
      badge: body.badge || '',
      featured: Boolean(body.featured ?? true),
      saved: Boolean(body.saved ?? false),
      isCustom: true,
      duration: body.duration || '',
      packs: body.packs || '',
      description: body.description || '',
      tags: Array.isArray(body.tags) && body.tags.length ? body.tags : []
    };

    newStyle.computedStartingPrice = calculateStylePrice(
      newStyle,
      newStyle.defaultSize,
      newStyle.defaultLength
    );

    db.styles.unshift(newStyle);
    saveDb();
    res.status(201).json(newStyle);
  });

  app.patch('/api/styles/:id', (req, res) => {
    const item = db.styles.find((s) => s.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Style not found' });
    const allowed = [
      'name',
      'category',
      'badge',
      'featured',
      'active',
      'pricingMode',
      'flatPrice',
      'priceOffset',
      'defaultSize',
      'defaultLength',
      'duration',
      'packs',
      'description',
      'image'
    ];
    for (const key of allowed) {
      if (req.body && req.body[key] !== undefined) {
        item[key] = req.body[key];
      }
    }
    saveDb();
    res.json(item);
  });

  app.delete('/api/styles/:id', (req, res) => {
    const { id } = req.params;
    const before = db.styles.length;
    db.styles = db.styles.filter((item) => item.id !== id);
    if (db.styles.length === before) {
      return res.status(404).json({ error: 'Style not found' });
    }
    saveDb();
    res.json({ ok: true, deletedId: id });
  });

  app.post('/api/promotions', (req, res) => {
    const body = req.body || {};
    if (!body.title || !String(body.title).trim()) {
      return res.status(400).json({ error: 'Promotion title is required' });
    }

    const code = String(body.code || `PROMO${Math.floor(10 + Math.random() * 89)}`)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

    const promo = {
      id: body.id || `promo-${Date.now()}`,
      title: String(body.title).trim(),
      subtitle: body.subtitle || '',
      discountPercent: Math.min(80, Math.max(5, Number(body.discountPercent || 15))),
      code,
      styleId: body.styleId || '',
      image: body.image || '',
      priceHighlight: body.priceHighlight || `${Number(body.discountPercent || 15)}% OFF`,
      originalPrice: body.originalPrice || '',
      validUntil: body.validUntil || '',
      theme: body.theme || '',
      active: true,
      badge: body.badge || '',
      createdAt: new Date().toISOString()
    };

    db.promotions.unshift(promo);

    const promoThread = db.threads.find((t) => t.id === 'thread-promos');
    if (promoThread) {
      promoThread.messages.push({
        id: `m-promo-${Date.now()}`,
        sender: 'salon',
        senderName: 'Salon',
        text: `${promo.title.toUpperCase()}! ${promo.subtitle} — Use code ${promo.code} (${promo.discountPercent}% OFF) before ${promo.validUntil}!`,
        image: promo.image,
        badge: `CODE: ${promo.code}`,
        timestamp: new Date().toTimeString().slice(0, 5),
        status: 'unread'
      });
      promoThread.unread = (promoThread.unread || 0) + 1;
    }

    saveDb();
    res.status(201).json(promo);
  });

  app.patch('/api/promotions/:id', (req, res) => {
    const promo = db.promotions.find((p) => p.id === req.params.id);
    if (!promo) return res.status(404).json({ error: 'Promotion not found' });
    if (typeof req.body?.active === 'boolean') promo.active = req.body.active;
    saveDb();
    res.json(promo);
  });

  app.delete('/api/promotions/:id', (req, res) => {
    const before = db.promotions.length;
    db.promotions = db.promotions.filter((p) => p.id !== req.params.id);
    if (db.promotions.length === before) {
      return res.status(404).json({ error: 'Promotion not found' });
    }
    saveDb();
    res.json({ ok: true });
  });

  app.post('/api/bookings', (req, res) => {
    const body = req.body || {};
    if (!body.clientName || !body.styleName || !body.date || !body.time) {
      return res.status(400).json({ error: 'Missing required booking fields' });
    }

    const stylistId = body.stylistId || '';
    const conflict = db.bookings.find(
      (b) =>
        b.status !== 'Cancelled' &&
        b.stylistId === stylistId &&
        b.date === body.date &&
        b.time === body.time &&
        b.id !== body.id
    );
    if (conflict) {
      return res.status(409).json({
        error: `${body.stylistName || 'This braider'} is already booked on ${body.date} at ${body.time}. Please select another time or braider.`
      });
    }

    const booking = {
      id: body.id || `NBP-${Math.floor(1000 + Math.random() * 9000)}`,
      clientName: String(body.clientName).trim(),
      clientPhone: String(body.clientPhone || '').trim(),
      styleId: body.styleId || '',
      styleName: body.styleName,
      styleImage: body.styleImage || '',
      size: body.size || 'medium',
      sizeLabel: body.sizeLabel || 'Medium',
      length: body.length || 'midback',
      lengthLabel: body.lengthLabel || 'Midback',
      hairColor: body.hairColor || '',
      stylistId,
      stylistName: body.stylistName || '',
      date: body.date,
      time: body.time,
      addOns: Array.isArray(body.addOns) ? body.addOns : [],
      promoCode: body.promoCode || '',
      subtotal: Number(body.subtotal || 0),
      discount: Number(body.discount || 0),
      total: Number(body.total || 0),
      deposit: Number(body.deposit || Math.round(Number(body.total || 0) * 0.3)),
      depositPaid: Boolean(body.depositPaid ?? false),
      paymentMethod: body.paymentMethod || 'Orange Money',
      notes: body.notes || '',
      status: body.status || 'Confirmed',
      createdAt: new Date().toISOString()
    };

    db.bookings.unshift(booking);
    saveDb();
    res.status(201).json(booking);
  });

  app.patch('/api/bookings/:id', (req, res) => {
    const booking = db.bookings.find((b) => b.id === req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (req.body.status) booking.status = req.body.status;
    if (req.body.date) booking.date = req.body.date;
    if (req.body.time) booking.time = req.body.time;
    if (typeof req.body.depositPaid === 'boolean') booking.depositPaid = req.body.depositPaid;
    if (req.body.paymentMethod) booking.paymentMethod = req.body.paymentMethod;
    if (req.body.notes !== undefined) booking.notes = req.body.notes;
    saveDb();
    res.json(booking);
  });

  app.post('/api/messages', (req, res) => {
    const {
      threadId = '',
      sender = 'client',
      senderName,
      text,
      image,
      badge,
      autoReply = true,
      styleName
    } = req.body || {};
    if (!text && !image) {
      return res.status(400).json({ error: 'Message text or image is required' });
    }

    let thread = db.threads.find((t) => t.id === threadId);
    if (!thread) {
      thread = {
        id: threadId,
        title: senderName || 'Client Inquiry',
        subtitle: 'Direct Salon Chat',
        avatar: '',
        online: true,
        pinned: false,
        unread: 0,
        role: 'Client',
        messages: []
      };
      db.threads.unshift(thread);
    }

    const nowTime = new Date().toTimeString().slice(0, 5);
    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender,
      senderName: senderName || (sender === 'salon' ? 'Salon' : 'You'),
      text: String(text || '').trim(),
      image: image || null,
      badge: badge || null,
      timestamp: nowTime,
      status: 'delivered'
    };

    thread.messages.push(message);

    let replyMessage = null;
    if (sender === 'client' && autoReply && threadId !== 'thread-promos') {
      replyMessage = {
        id: `msg-reply-${Date.now()}`,
        sender: 'salon',
        senderName: threadId === 'thread-care' ? 'Stylist' : 'Salon',
        text: generateSmartSalonReply(message.text, { styleName }),
        timestamp: nowTime,
        status: 'read'
      };
      thread.messages.push(replyMessage);
    }

    saveDb();
    res.status(201).json({ message, replyMessage, thread });
  });

  const publicDir = path.join(__dirname, 'public');
  app.use(express.static(publicDir, { extensions: ['html'] }));

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API route not found' });
    }
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  return app;
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isMain) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '0.0.0.0';
  const app = createApp();
  app.listen(port, host, () => {
    console.log(`Nicole Beauty Parlour running on http://${host}:${port}`);
  });
}

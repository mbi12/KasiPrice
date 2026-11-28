// Hybrid Persistent Store: LocalStorage + REST API + Admin Phone/Password Auth + BroadcastChannel Sync
import {
  SALON_INFO,
  OFFICIAL_PRICE_MATRIX,
  INITIAL_HAIRSTYLES,
  INITIAL_PROMOTIONS,
  INITIAL_BOOKINGS,
  INITIAL_THREADS,
  setPriceMatrix
} from './data.js';

const STORAGE_KEY = 'nicole_beauty_parlour_state_v4';
const CHANNEL_NAME = 'nicole_beauty_parlour_channel_v4';
const ADMIN_SESSION_KEY = 'nbp_admin_session_v3';
const ADMIN_LOCAL_CRED_KEY = 'nbp_admin_offline_cred_v3';

export function normalizePhoneClient(raw = '') {
  const digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('267') && digits.length > 8) return digits.slice(3);
  if (digits.startsWith('0') && digits.length > 8) return digits.slice(1);
  return digits;
}

async function sha256Hex(input) {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Simple fallback if subtle crypto unavailable on non-HTTPS LAN IP
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return String(h >>> 0);
}

function clone(val) {
  return JSON.parse(JSON.stringify(val));
}

function getDefaultState() {
  return {
    matrix: structuredClone(OFFICIAL_PRICE_MATRIX),
    styles: clone(INITIAL_HAIRSTYLES),
    promotions: clone(INITIAL_PROMOTIONS),
    bookings: clone(INITIAL_BOOKINGS),
    threads: clone(INITIAL_THREADS),
    notifications: []
  };
}

export class SalonStore {
  constructor() {
    this.listeners = new Set();
    this.state = this.loadLocal();
    this.adminSession = this.loadAdminSession();
    this.channel =
      typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;

    if (this.channel) {
      this.channel.onmessage = (event) => {
        if (event.data && event.data.type === 'STATE_UPDATED') {
          this.state = this.loadLocal();
          this.adminSession = this.loadAdminSession();
          this.emit();
        }
      };
    }
  }

  /* ================= ADMIN AUTHENTICATION ================= */
  loadAdminSession() {
    try {
      const raw =
        localStorage.getItem(ADMIN_SESSION_KEY) || sessionStorage.getItem(ADMIN_SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.authenticated) return parsed;
      }
    } catch {
      // Ignore storage error
    }
    return { authenticated: false, token: null, admin: null };
  }

  saveAdminSession(session, remember = true) {
    this.adminSession = session;
    try {
      localStorage.removeItem(ADMIN_SESSION_KEY);
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      if (session && session.authenticated) {
        const target = remember ? localStorage : sessionStorage;
        target.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
      }
      if (this.channel) {
        this.channel.postMessage({ type: 'STATE_UPDATED', ts: Date.now() });
      }
    } catch {
      // Ignore
    }
    this.emit();
  }

  isAdmin() {
    return Boolean(this.adminSession?.authenticated);
  }

  getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.adminSession?.token) {
      headers.Authorization = `Bearer ${this.adminSession.token}`;
    }
    return headers;
  }

  async ensureLocalCredentialSeed() {
    try {
      const existing = localStorage.getItem(ADMIN_LOCAL_CRED_KEY);
      if (existing) return JSON.parse(existing);
      const digest = await sha256Hex('72517904::Nicole2026::nbp_salt');
      const seed = {
        phone: '72517904',
        name: '',
        digest
      };
      localStorage.setItem(ADMIN_LOCAL_CRED_KEY, JSON.stringify(seed));
      return seed;
    } catch {
      return { phone: '72517904', name: '', digest: '' };
    }
  }

  async loginAdmin({ phone, password, remember = true }) {
    const cleanPhone = normalizePhoneClient(phone);
    if (!cleanPhone || !password) {
      return { ok: false, error: 'Please enter both your admin phone number and password.' };
    }

    // 1. Try server verification first
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, password })
      });

      if (res.ok) {
        const data = await res.json();
        const digest = await sha256Hex(`${cleanPhone}::${password}::nbp_salt`);
        try {
          localStorage.setItem(
            ADMIN_LOCAL_CRED_KEY,
            JSON.stringify({ phone: cleanPhone, name: data.admin?.name || '', digest })
          );
        } catch {
          // Ignore
        }
        const session = {
          authenticated: true,
          token: data.token,
          admin: data.admin || {
            name: '',
            phone: cleanPhone,
            displayPhone: `+267 ${cleanPhone}`
          }
        };
        this.saveAdminSession(session, remember);
        return { ok: true, admin: session.admin };
      }

      // Check if local custom password was set on serverless cold-start
      const localCred = await this.ensureLocalCredentialSeed();
      const candidateDigest = await sha256Hex(`${cleanPhone}::${password}::nbp_salt`);
      if (localCred.phone === cleanPhone && localCred.digest === candidateDigest) {
        const session = {
          authenticated: true,
          token: 'local-verified-session',
          admin: {
            name: localCred.name || '',
            phone: cleanPhone,
            displayPhone: `+267 ${cleanPhone}`
          }
        };
        this.saveAdminSession(session, remember);
        return { ok: true, admin: session.admin };
      }

      const errData = await res.json().catch(() => ({}));
      return { ok: false, error: errData.error || 'Incorrect phone number or password.' };
    } catch {
      // Offline native APK / iOS fallback
      const localCred = await this.ensureLocalCredentialSeed();
      const candidateDigest = await sha256Hex(`${cleanPhone}::${password}::nbp_salt`);
      if (localCred.phone === cleanPhone && localCred.digest === candidateDigest) {
        const session = {
          authenticated: true,
          token: 'offline-owner-session',
          admin: {
            name: localCred.name || '',
            phone: cleanPhone,
            displayPhone: `+267 ${cleanPhone}`
          }
        };
        this.saveAdminSession(session, remember);
        return { ok: true, admin: session.admin };
      }
      return { ok: false, error: 'Incorrect phone number or password.' };
    }
  }

  logoutAdmin() {
    this.saveAdminSession({ authenticated: false, token: null, admin: null }, true);
  }

  async updateAdminCredentials({ currentPassword, newPhone, newPassword, ownerName }) {
    const cleanPhone = normalizePhoneClient(
      newPhone || this.adminSession?.admin?.phone || '72517904'
    );
    if (cleanPhone.length < 7) {
      return { ok: false, error: 'Please enter a valid phone number (at least 7 digits).' };
    }
    if (newPassword && String(newPassword).length < 6) {
      return { ok: false, error: 'New password must be at least 6 characters.' };
    }

    // Verify against server if reachable
    try {
      const res = await fetch('/api/admin/credentials', {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ currentPassword, newPhone: cleanPhone, newPassword, ownerName })
      });
      if (res.ok) {
        const data = await res.json();
        const finalPass = newPassword || currentPassword;
        const digest = await sha256Hex(`${cleanPhone}::${finalPass}::nbp_salt`);
        localStorage.setItem(
          ADMIN_LOCAL_CRED_KEY,
          JSON.stringify({ phone: cleanPhone, name: data.admin.name, digest })
        );
        this.saveAdminSession(
          {
            authenticated: true,
            token: data.token,
            admin: data.admin
          },
          true
        );
        return { ok: true, admin: data.admin };
      }
      const errBody = await res.json().catch(() => ({}));
      if (res.status === 403 || res.status === 400) {
        return { ok: false, error: errBody.error || 'Could not update credentials.' };
      }
    } catch {
      // Offline fallback below
    }

    // Local verification fallback (for serverless cold resets or offline native app)
    const localCred = await this.ensureLocalCredentialSeed();
    const curDigest = await sha256Hex(`${localCred.phone}::${currentPassword}::nbp_salt`);
    if (curDigest !== localCred.digest) {
      return { ok: false, error: 'Current password is incorrect.' };
    }

    const finalPass = newPassword || currentPassword;
    const newDigest = await sha256Hex(`${cleanPhone}::${finalPass}::nbp_salt`);
    const updatedName = (ownerName && ownerName.trim()) || localCred.name || '';
    localStorage.setItem(
      ADMIN_LOCAL_CRED_KEY,
      JSON.stringify({ phone: cleanPhone, name: updatedName, digest: newDigest })
    );
    const admin = {
      name: updatedName,
      phone: cleanPhone,
      displayPhone: `+267 ${cleanPhone}`
    };
    this.saveAdminSession(
      {
        authenticated: true,
        token: this.adminSession?.token || 'local-verified-session',
        admin
      },
      true
    );
    return { ok: true, admin };
  }

  /* ================= STATE PERSISTENCE ================= */
  loadLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.styles) && parsed.styles.length) {
          if (parsed.matrix && typeof parsed.matrix === 'object') {
            setPriceMatrix(parsed.matrix);
          }
          return parsed;
        }
      }
    } catch {
      // Ignore storage errors
    }
    setPriceMatrix(OFFICIAL_PRICE_MATRIX);
    return getDefaultState();
  }

  saveLocal(broadcast = true) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      if (broadcast && this.channel) {
        this.channel.postMessage({ type: 'STATE_UPDATED', ts: Date.now() });
      }
    } catch {
      // Storage quota fallback
    }
    this.emit();
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    for (const fn of this.listeners) {
      fn(this.state);
    }
  }

  async syncFromServer() {
    try {
      const res = await fetch('/api/state', { headers: { Accept: 'application/json' } });
      if (!res.ok) return;
      const serverData = await res.json();
      if (!serverData || !Array.isArray(serverData.styles)) return;

      const mergeById = (localArr = [], serverArr = []) => {
        const map = new Map();
        for (const item of serverArr) map.set(item.id, item);
        for (const item of localArr) {
          if (!map.has(item.id)) map.set(item.id, item);
          else {
            const srv = map.get(item.id);
            map.set(item.id, { ...srv, ...item });
          }
        }
        return Array.from(map.values());
      };

      this.state.styles = mergeById(this.state.styles, serverData.styles);
      this.state.promotions = mergeById(this.state.promotions, serverData.promotions);
      this.state.bookings = mergeById(this.state.bookings, serverData.bookings);
      if (serverData.matrix && typeof serverData.matrix === 'object') {
        this.state.matrix = serverData.matrix;
        setPriceMatrix(serverData.matrix);
      }
      if (!this.state.threads?.length && Array.isArray(serverData.threads)) {
        this.state.threads = serverData.threads;
      }
      this.saveLocal(false);
    } catch {
      // Offline mode works seamlessly
    }
  }

  addNotification({ title, body, type = 'info' }) {
    this.state.notifications.unshift({
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      title,
      body,
      time: 'Just now',
      unread: true,
      type
    });
    this.saveLocal();
  }

  markNotificationsRead() {
    this.state.notifications.forEach((n) => {
      n.unread = false;
    });
    this.saveLocal();
  }

  toggleSaveStyle(styleId) {
    const item = this.state.styles.find((s) => s.id === styleId);
    if (!item) return false;
    item.saved = !item.saved;
    this.saveLocal();
    return item.saved;
  }

  async addStyle(stylePayload) {
    const newStyle = {
      id: `style-custom-${Date.now()}`,
      rating: 5.0,
      reviewsCount: 1,
      featured: true,
      saved: false,
      isCustom: true,
      ...stylePayload
    };

    this.state.styles.unshift(newStyle);
    this.addNotification({
      title: 'New Couture Style Published',
      body: `"${newStyle.name}" is now live across Runway, Gallery & Booking!`,
      type: 'style'
    });

    try {
      await fetch('/api/styles', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(newStyle)
      });
    } catch {
      // Saved locally
    }

    return newStyle;
  }

  async updateStyle(styleId, patch) {
    const item = this.state.styles.find((s) => s.id === styleId);
    if (!item) return null;
    Object.assign(item, patch);
    this.saveLocal();
    try {
      await fetch(`/api/styles/${encodeURIComponent(styleId)}`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(patch)
      });
    } catch {
      // Synced locally
    }
    return item;
  }

  async updateMatrix(matrix) {
    this.state.matrix = matrix;
    setPriceMatrix(matrix);
    this.saveLocal();
    try {
      await fetch('/api/pricing', {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ matrix })
      });
    } catch {
      // Saved locally
    }
    return this.state.matrix;
  }

  async deleteStyle(styleId) {
    this.state.styles = this.state.styles.filter((s) => s.id !== styleId);
    this.saveLocal();
    try {
      await fetch(`/api/styles/${encodeURIComponent(styleId)}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
    } catch {
      // Removed locally
    }
  }

  async createPromotion(promoPayload) {
    const code = String(promoPayload.code || `NICOLE${Math.floor(10 + Math.random() * 89)}`)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

    const promo = {
      id: `promo-${Date.now()}`,
      active: true,
      createdAt: new Date().toISOString(),
      ...promoPayload,
      code
    };

    this.state.promotions.unshift(promo);

    const promoThread = this.state.threads.find((t) => t.id === 'thread-promos');
    if (promoThread) {
      promoThread.messages.push({
        id: `m-promo-${Date.now()}`,
        sender: 'salon',
        senderName: 'Salon',
        text: `NEW CAMPAIGN: ${promo.title} — ${promo.subtitle} Apply code ${promo.code} for ${promo.discountPercent}% OFF (until ${promo.validUntil}).`,
        image: promo.image,
        badge: `PROMO • ${promo.code}`,
        timestamp: new Date().toTimeString().slice(0, 5),
        status: 'unread'
      });
      promoThread.unread = (promoThread.unread || 0) + 1;
    }

    this.addNotification({
      title: `Campaign Live: ${promo.title}`,
      body: `Code ${promo.code} (${promo.discountPercent}% OFF) published to Runway & VIP Channel.`,
      type: 'promo'
    });

    try {
      await fetch('/api/promotions', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(promo)
      });
    } catch {
      // Saved locally
    }

    return promo;
  }

  async togglePromotion(promoId) {
    const promo = this.state.promotions.find((p) => p.id === promoId);
    if (!promo) return null;
    promo.active = !promo.active;
    this.saveLocal();
    try {
      await fetch(`/api/promotions/${encodeURIComponent(promoId)}`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ active: promo.active })
      });
    } catch {
      // Synced locally
    }
    return promo;
  }

  async deletePromotion(promoId) {
    this.state.promotions = this.state.promotions.filter((p) => p.id !== promoId);
    this.saveLocal();
    try {
      await fetch(`/api/promotions/${encodeURIComponent(promoId)}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
    } catch {
      // Removed locally
    }
  }

  isSlotBooked(stylistId, date, time) {
    return this.state.bookings.some(
      (b) =>
        b.status !== 'Cancelled' &&
        b.stylistId === stylistId &&
        b.date === date &&
        b.time === time
    );
  }

  getSavedClientPhone() {
    try {
      return localStorage.getItem('nbp_client_phone_v3') || '';
    } catch {
      return '';
    }
  }

  saveClientPhone(phone) {
    try {
      if (phone) localStorage.setItem('nbp_client_phone_v3', String(phone).trim());
    } catch {
      // Ignore
    }
  }

  async createBooking(bookingPayload) {
    const stylistId = bookingPayload.stylistId || '';
    if (this.isSlotBooked(stylistId, bookingPayload.date, bookingPayload.time)) {
      throw new Error(
        `${bookingPayload.stylistName || 'This braider'} is already booked on ${bookingPayload.date} at ${bookingPayload.time}. Please choose another time or braider.`
      );
    }

    const booking = {
      id: `NBP-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'Confirmed',
      depositPaid: false,
      createdAt: new Date().toISOString(),
      ...bookingPayload
    };

    if (booking.clientPhone) {
      this.saveClientPhone(booking.clientPhone);
    }

    this.state.bookings.unshift(booking);

    const mainThread = this.state.threads.find((t) => t.id === '');
    if (mainThread) {
      const nowTime = new Date().toTimeString().slice(0, 5);
      mainThread.messages.push({
        id: `m-bk-client-${Date.now()}`,
        sender: 'client',
        senderName: booking.clientName,
        text: `New Booking (${booking.id}): ${booking.styleName} (${booking.sizeLabel} • ${booking.lengthLabel}${booking.hairColor ? ` • ${booking.hairColor}` : ''}) on ${booking.date} at ${booking.time} — Total P${booking.total}`,
        image: booking.styleImage,
        badge: `BOOKING ${booking.id}`,
        timestamp: nowTime,
        status: 'read'
      });
      mainThread.messages.push({
        id: `m-bk-salon-${Date.now() + 1}`,
        sender: 'salon',
        senderName: 'Salon',
        text: `Thank you ${booking.clientName}! Your appointment with ${booking.stylistName} on ${booking.date} at ${booking.time} is confirmed (Ref: ${booking.id}). 30% Deposit: P${booking.deposit} via ${booking.paymentMethod}.`,
        timestamp: nowTime,
        status: 'unread'
      });
      mainThread.unread = (mainThread.unread || 0) + 1;
    }

    this.addNotification({
      title: `Booking Confirmed (${booking.id})`,
      body: `${booking.styleName} • ${booking.date} at ${booking.time} • P${booking.total}`,
      type: 'booking'
    });

    try {
      await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking)
      });
    } catch {
      // Saved locally
    }

    return booking;
  }

  async updateBookingStatus(bookingId, patch) {
    const booking = this.state.bookings.find((b) => b.id === bookingId);
    if (!booking) return null;
    Object.assign(booking, patch);
    this.saveLocal();
    try {
      await fetch(`/api/bookings/${encodeURIComponent(bookingId)}`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(patch)
      });
    } catch {
      // Saved locally
    }
    return booking;
  }

  markThreadRead(threadId) {
    const thread = this.state.threads.find((t) => t.id === threadId);
    if (!thread) return;
    thread.unread = 0;
    thread.messages.forEach((m) => {
      m.status = 'read';
    });
    this.saveLocal();
  }

  generateLocalSalonReply(userText = '', styleName = '') {
    // Demo/mockup replies have been cleared. Return a neutral acknowledgment.
    if (styleName) {
      return `Thanks for your interest in "${styleName}". Add your braid details and tap Reserve to book your chair.`;
    }
    return 'Thanks for your message! Add your salon details and we will be happy to help you book your chair.';
  }

  sendMessage({ threadId = '', sender = 'client', senderName, text, image = null, badge = null, styleName = '' }) {
    const thread = this.state.threads.find((t) => t.id === threadId);
    if (!thread) return null;

    const nowTime = new Date().toTimeString().slice(0, 5);
    const msg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      sender,
      senderName: senderName || (sender === 'salon' ? 'Salon' : 'You'),
      text: String(text || '').trim(),
      image,
      badge,
      timestamp: nowTime,
      status: 'delivered'
    };

    thread.messages.push(msg);
    this.saveLocal();

    fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        threadId,
        sender,
        senderName: msg.senderName,
        text: msg.text,
        image,
        badge,
        autoReply: false,
        styleName
      })
    }).catch(() => {});

    return msg;
  }
}

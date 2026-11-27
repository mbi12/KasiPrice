// Hybrid Persistent Store: LocalStorage + REST API + Live BroadcastChannel Cross-Tab Sync
import {
  SALON_INFO,
  INITIAL_HAIRSTYLES,
  INITIAL_PROMOTIONS,
  INITIAL_BOOKINGS,
  INITIAL_THREADS
} from './data.js';

const STORAGE_KEY = 'nicole_beauty_parlour_state_v2';
const CHANNEL_NAME = 'nicole_beauty_parlour_channel_v2';

function clone(val) {
  return JSON.parse(JSON.stringify(val));
}

function getDefaultState() {
  return {
    styles: clone(INITIAL_HAIRSTYLES),
    promotions: clone(INITIAL_PROMOTIONS),
    bookings: clone(INITIAL_BOOKINGS),
    threads: clone(INITIAL_THREADS),
    notifications: [
      {
        id: 'notif-welcome',
        title: 'Welcome to Nicole Beauty Parlour',
        body: 'Apply code SLAY15 for 15% OFF S-Medium & Small Knotless Braids — or try our new Virtual Style Mirror!',
        time: 'Just now',
        unread: true,
        type: 'promo'
      },
      {
        id: 'notif-flat250',
        title: "Pick n' Drop & Softdread • Flat P250",
        body: 'Official P250 rate open all week — book Chair 01, 02, or 03 with instant VIP pass.',
        time: '1 hr ago',
        unread: false,
        type: 'deal'
      }
    ]
  };
}

export class SalonStore {
  constructor() {
    this.listeners = new Set();
    this.state = this.loadLocal();
    this.channel =
      typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;

    if (this.channel) {
      this.channel.onmessage = (event) => {
        if (event.data && event.data.type === 'STATE_UPDATED') {
          this.state = this.loadLocal();
          this.emit();
        }
      };
    }
  }

  loadLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.styles) && parsed.styles.length) {
          return parsed;
        }
      }
    } catch {
      // Ignore storage errors
    }
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
      if (!this.state.threads?.length && Array.isArray(serverData.threads)) {
        this.state.threads = serverData.threads;
      }
      this.saveLocal(false);
    } catch {
      // Offline / native WebView mode works seamlessly from local store
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStyle)
      });
    } catch {
      // Saved locally
    }

    return newStyle;
  }

  async deleteStyle(styleId) {
    this.state.styles = this.state.styles.filter((s) => s.id !== styleId);
    this.saveLocal();
    try {
      await fetch(`/api/styles/${encodeURIComponent(styleId)}`, { method: 'DELETE' });
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
        senderName: 'Nicole Promo Studio',
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
      await fetch(`/api/promotions/${encodeURIComponent(promoId)}`, { method: 'DELETE' });
    } catch {
      // Removed locally
    }
  }

  async createBooking(bookingPayload) {
    const booking = {
      id: `NBP-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'Confirmed',
      createdAt: new Date().toISOString(),
      ...bookingPayload
    };

    this.state.bookings.unshift(booking);

    const mainThread = this.state.threads.find((t) => t.id === 'thread-nicole');
    if (mainThread) {
      const nowTime = new Date().toTimeString().slice(0, 5);
      mainThread.messages.push({
        id: `m-bk-client-${Date.now()}`,
        sender: 'client',
        senderName: booking.clientName,
        text: `Reserved VIP Chair: ${booking.styleName} (${booking.sizeLabel} • ${booking.lengthLabel}${booking.hairColor ? ` • ${booking.hairColor}` : ''}) on ${booking.date} at ${booking.time} — Total P${booking.total} (Pass ${booking.id})`,
        image: booking.styleImage,
        badge: `VIP PASS ${booking.id}`,
        timestamp: nowTime,
        status: 'read'
      });
      mainThread.messages.push({
        id: `m-bk-salon-${Date.now() + 1}`,
        sender: 'salon',
        senderName: 'Nicole',
        text: `Confirmed, ${booking.clientName}! Your chair with ${booking.stylistName} is locked in for ${booking.date} at ${booking.time} (Pass ${booking.id}). 30% Deposit: P${booking.deposit} via ${booking.paymentMethod}. Get ready to Look Good, Feel Good, Be You!`,
        timestamp: nowTime,
        status: 'unread'
      });
      mainThread.unread = (mainThread.unread || 0) + 1;
    }

    this.addNotification({
      title: `VIP Pass Issued (${booking.id})`,
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
        headers: { 'Content-Type': 'application/json' },
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
    const q = String(userText).toLowerCase();
    const activePromo = this.state.promotions.find((p) => p.active);
    const promoHint = activePromo
      ? ` Use code ${activePromo.code} for ${activePromo.discountPercent}% OFF!`
      : '';

    if (q.includes('price') || q.includes('how much') || q.includes('cost') || q.includes('pula') || q.includes('list')) {
      return `Official Nicole Beauty Parlour BWP Rates:\n• Jumbo: P130 (Midback) | P160 (Butt) | P200 (Knee)\n• Large: P160 | P200 | P250\n• Medium: P180 | P250 | P300\n• S-Medium: P200 | P300 | P400\n• Small: P250 | P350 | P500\n• Pick n' Drop / Switch / Softdread: Flat P250.${promoHint}`;
    }
    if (q.includes('where') || q.includes('location') || q.includes('address') || q.includes('house')) {
      return `We are located in ${SALON_INFO.location} (${SALON_INFO.hours}). Prefer to be braided at home? Tick "VIP Private House-Call (+P80)" when booking, or WhatsApp ${SALON_INFO.phoneDisplay}.`;
    }
    if (q.includes('pack') || q.includes('hair') || q.includes('buy') || q.includes('color') || q.includes('shade')) {
      return `Hair Packs & Shade Guide:\n• Jumbo/Large: 4–5 packs\n• Medium: 5–6 packs\n• S-Medium/Small: 6–8 packs.\nOr select "Premium Braiding Packs Supplied (+P120)" during booking and we will prepare your exact shade (#1B, #27, #30, #99J, #613)!`;
    }
    if (q.includes('pay') || q.includes('deposit') || q.includes('orange') || q.includes('myzaka')) {
      return `Your 30% chair deposit can be paid via Orange Money, MyZaka, Smega (${SALON_INFO.phoneRaw}), FNB eWallet, or Pay at Parlour.`;
    }
    if (q.includes('slot') || q.includes('available') || q.includes('today') || q.includes('tomorrow') || q.includes('weekend')) {
      return `Chairs 01, 02 & 03 have openings between 07:30 and 16:30! Tap "Reserve" below to lock in your time and receive your holographic VIP Pass.${promoHint}`;
    }
    if (styleName) {
      return `Stunning choice! "${styleName}" can be tailored in Midback, Butt Length, or Knee Length with your favourite shade. Tap "Reserve" to customize and lock your slot!`;
    }
    return `Received! Nicole's Concierge (${SALON_INFO.phoneDisplay}) is right here — ask about BWP pricing, shade blends, or tap "Reserve" to book your chair.`;
  }

  sendMessage({ threadId = 'thread-nicole', sender = 'client', senderName, text, image = null, badge = null, styleName = '' }) {
    const thread = this.state.threads.find((t) => t.id === threadId);
    if (!thread) return null;

    const nowTime = new Date().toTimeString().slice(0, 5);
    const msg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      sender,
      senderName: senderName || (sender === 'salon' ? 'Nicole' : 'You'),
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

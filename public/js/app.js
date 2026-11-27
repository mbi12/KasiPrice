// Nicole Beauty Parlour — Clean Professional Salon App & Protected Admin Suite
import {
  SALON_INFO,
  OFFICIAL_PRICE_MATRIX,
  SPECIALTY_FLAT_PRICE,
  SIZE_OPTIONS,
  LENGTH_OPTIONS,
  HAIR_COLORS,
  CATEGORIES,
  STYLISTS,
  ADD_ONS,
  TIME_SLOTS,
  calculateStylePrice
} from './data.js';
import { SalonStore, normalizePhoneClient } from './store.js';
import { renderPromoFlyerToCanvas, renderPromoFlyerBlob, compressImageFile } from './flyer.js';

const store = new SalonStore();

const PACKS_BY_SIZE = {
  jumbo: '4 packs',
  large: '4–5 packs',
  medium: '5–6 packs',
  s_medium: '6–7 packs',
  small: '7–8 packs'
};

const DURATION_BY_SIZE = {
  jumbo: '2.5 – 3.5 hrs',
  large: '3 – 4 hrs',
  medium: '4 – 5 hrs',
  s_medium: '5 – 6 hrs',
  small: '6 – 7.5 hrs'
};

const ui = {
  activeTab: 'services',
  // Catalog filters
  selectedCategory: 'all',
  searchQuery: '',
  sortBy: 'featured',
  // Quick estimator
  estSize: 'medium',
  estLength: 'midback',
  // Style detail modal
  detailStyleId: null,
  detailSize: 'medium',
  detailLength: 'midback',
  // Booking form state
  bookStyleId: 'style-01',
  bookSize: 'medium',
  bookLength: 'midback',
  bookColorId: '1b',
  bookStylistId: 'nicole',
  bookDate: getUpcomingDates(14)[1]?.iso || getUpcomingDates(14)[0]?.iso,
  bookTime: '09:00',
  bookAddOnIds: new Set(),
  appliedPromo: null,
  lookupPhone: '',
  // Chat state
  senderMode: 'client',
  pendingChatAttachment: null,
  // Admin state
  adminPane: 'overview',
  adminBookingQuery: '',
  adminBookingStatus: 'All',
  adminStyleQuery: '',
  pendingAdminCallback: null,
  // Studio uploads & flyers
  newStyleImage: '/images/style-01-honey-curly-knotless.jpg',
  lastFlyerBlob: null,
  lastFlyerPromo: null
};

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatPula(amount) {
  return `P${Math.round(Number(amount || 0)).toLocaleString('en-BW')}`;
}

function getUpcomingDates(days = 14) {
  const out = [];
  const base = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 0; i < days; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    out.push({
      iso: `${yyyy}-${mm}-${dd}`,
      dayName: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : dayNames[d.getDay()],
      dayNum: d.getDate(),
      month: monthNames[d.getMonth()]
    });
  }
  return out;
}

export function showToast(message) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast-msg';
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 180ms ease';
    setTimeout(() => el.remove(), 200);
  }, 2600);
}

/* ================= NAVIGATION & MODALS ================= */
function switchTab(tabId) {
  ui.activeTab = tabId;
  document.querySelectorAll('.view').forEach((v) => {
    v.classList.toggle('active', v.id === `view-${tabId}`);
  });
  document.querySelectorAll('.nav-link[data-tab], .bottom-tab[data-tab]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (tabId === 'messages') {
    store.markThreadRead('thread-nicole');
    renderMessenger();
    scrollChatBottom();
  }
  if (tabId === 'studio') {
    renderAdminView();
  }
}

function openModal(id) {
  document.getElementById(id)?.classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id)?.classList.add('hidden');
}

function requireAdminAuth(callback) {
  if (store.isAdmin()) {
    if (typeof callback === 'function') callback();
    return true;
  }
  ui.pendingAdminCallback = typeof callback === 'function' ? callback : null;
  switchTab('studio');
  showToast('Sign in with your Admin phone number & password first');
  setTimeout(() => document.getElementById('adminPhoneInput')?.focus(), 100);
  return false;
}

/* ================= VIEW 1: SERVICES & DEALS ================= */
function renderDealsStrip() {
  const wrap = document.getElementById('activeDealsWrap');
  const row = document.getElementById('promoDealsRow');
  if (!wrap || !row) return;

  const activePromos = store.state.promotions.filter((p) => p.active);
  wrap.classList.toggle('hidden', activePromos.length === 0);
  if (!activePromos.length) return;

  row.innerHTML = activePromos
    .map(
      (p) => `
    <div class="deal-card">
      <div class="deal-info">
        <strong>${esc(p.title)} (${p.discountPercent}% OFF)</strong>
        <span>${esc(p.subtitle)}</span>
      </div>
      <button type="button" class="deal-code-btn" data-apply-promo="${esc(p.code)}">
        Use ${esc(p.code)}
      </button>
    </div>`
    )
    .join('');

  row.querySelectorAll('[data-apply-promo]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const promo = activePromos.find((x) => x.code === btn.dataset.applyPromo);
      if (!promo) return;
      ui.appliedPromo = promo;
      const inp = document.getElementById('bookPromoInput');
      if (inp) inp.value = promo.code;
      switchTab('book');
      renderBookingView();
      showToast(`Code ${promo.code} (${promo.discountPercent}% OFF) applied to booking`);
    });
  });
}

function renderServicesCatalog() {
  renderDealsStrip();

  const catStrip = document.getElementById('categoryStrip');
  if (catStrip) {
    catStrip.innerHTML = CATEGORIES.map((cat) => {
      const catId = typeof cat === 'object' ? cat.id : cat;
      const catLbl = typeof cat === 'object' ? cat.label : cat;
      return `<button type="button" class="cat-chip ${ui.selectedCategory === catId ? 'active' : ''}" data-cat="${esc(catId)}">${esc(catLbl)}</button>`;
    }).join('');
    catStrip.querySelectorAll('[data-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        ui.selectedCategory = btn.dataset.cat;
        renderServicesCatalog();
      });
    });
  }

  document
    .getElementById('clearSearchBtn')
    ?.classList.toggle('hidden', ui.searchQuery.trim().length === 0);

  const q = ui.searchQuery.trim().toLowerCase();
  const visibleStyles = store.state.styles.filter((s) => s.active !== false);

  let items = visibleStyles.filter((s) => {
    if (ui.selectedCategory !== 'all' && s.category !== ui.selectedCategory) return false;
    if (!q) return true;
    const startP = calculateStylePrice(s, s.defaultSize, s.defaultLength);
    const hay = `${s.name} ${s.category} ${s.description || ''} ${s.badge || ''} p${startP}`.toLowerCase();
    return hay.includes(q);
  });

  if (ui.sortBy === 'price-asc') {
    items.sort(
      (a, b) =>
        calculateStylePrice(a, a.defaultSize, a.defaultLength) -
        calculateStylePrice(b, b.defaultSize, b.defaultLength)
    );
  } else if (ui.sortBy === 'price-desc') {
    items.sort(
      (a, b) =>
        calculateStylePrice(b, b.defaultSize, b.defaultLength) -
        calculateStylePrice(a, a.defaultSize, a.defaultLength)
    );
  } else {
    items.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
  }

  const countLbl = document.getElementById('servicesCountLabel');
  if (countLbl) {
    countLbl.textContent = `${items.length} service${items.length === 1 ? '' : 's'} available`;
  }

  const grid = document.getElementById('servicesGrid');
  if (!grid) return;

  if (!items.length) {
    grid.innerHTML = `
      <div class="card" style="grid-column:1/-1;text-align:center;">
        <p class="muted-text mb-12">No hairstyles match "${esc(ui.searchQuery)}".</p>
        <button type="button" class="btn btn-secondary btn-sm" id="resetCatalogFiltersBtn">Reset Filters</button>
      </div>`;
    document.getElementById('resetCatalogFiltersBtn')?.addEventListener('click', () => {
      ui.selectedCategory = 'all';
      ui.searchQuery = '';
      const inp = document.getElementById('serviceSearchInput');
      if (inp) inp.value = '';
      renderServicesCatalog();
    });
    return;
  }

  grid.innerHTML = items
    .map((s) => {
      const startPrice = calculateStylePrice(s, s.defaultSize, s.defaultLength);
      const priceHint = s.pricingMode === 'flat' ? 'Flat Rate' : 'Starting at';
      return `
      <article class="service-card">
        <div class="service-photo-wrap" data-open-detail="${esc(s.id)}">
          <img src="${esc(s.image)}" alt="${esc(s.name)}" loading="lazy" />
          ${s.badge ? `<span class="service-badge">${esc(s.badge)}</span>` : ''}
        </div>
        <div class="service-body">
          <div>
            <h3 class="service-title" data-open-detail="${esc(s.id)}">${esc(s.name)}</h3>
            <p class="service-meta">${esc(s.duration)} • ${esc(s.packs)}</p>
          </div>
          <div class="service-footer">
            <div class="service-price-col">
              <span>${priceHint}</span>
              <strong>${formatPula(startPrice)}</strong>
            </div>
            <button type="button" class="btn btn-primary btn-sm" data-quick-book="${esc(s.id)}">
              Book
            </button>
          </div>
        </div>
      </article>`;
    })
    .join('');

  grid.querySelectorAll('[data-open-detail]').forEach((el) => {
    el.addEventListener('click', () => openServiceDetailModal(el.dataset.openDetail));
  });
  grid.querySelectorAll('[data-quick-book]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const st = store.state.styles.find((x) => x.id === btn.dataset.quickBook);
      if (st) jumpToBook(st.id, st.defaultSize, st.defaultLength);
    });
  });
}

function openServiceDetailModal(styleId) {
  const s = store.state.styles.find((x) => x.id === styleId);
  if (!s) return;
  ui.detailStyleId = s.id;
  ui.detailSize = s.defaultSize || 'medium';
  ui.detailLength = s.defaultLength || 'midback';
  renderServiceDetailModal();
  openModal('styleDetailModal');
}

function renderServiceDetailModal() {
  const host = document.getElementById('styleDetailContent');
  const s = store.state.styles.find((x) => x.id === ui.detailStyleId);
  if (!host || !s) return;

  const price = calculateStylePrice(s, ui.detailSize, ui.detailLength);
  const deposit = Math.round(price * 0.3);

  host.innerHTML = `
    <div class="detail-modal-hero">
      <img src="${esc(s.image)}" alt="${esc(s.name)}" />
      <div>
        <span class="tag-badge">${esc(s.category)}</span>
        <h3 style="margin:6px 0;">${esc(s.name)}</h3>
        <p class="muted-text">${esc(s.description || '')}</p>
        <div class="info-list">
          <div class="info-item"><span>Duration</span><strong>${esc(s.duration)}</strong></div>
          <div class="info-item"><span>Hair Packs</span><strong>${esc(s.packs)}</strong></div>
          <div class="info-item"><span>30% Deposit</span><strong>${formatPula(deposit)}</strong></div>
        </div>
      </div>
    </div>

    ${
      s.pricingMode !== 'flat'
        ? `
      <div class="form-row-2 mb-12">
        <div class="field">
          <label for="detailSizeSel">Braid Size</label>
          <select id="detailSizeSel" class="input-select">
            ${SIZE_OPTIONS.map((sz) => `<option value="${sz.id}" ${ui.detailSize === sz.id ? 'selected' : ''}>${esc(sz.label)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="detailLenSel">Braid Length</label>
          <select id="detailLenSel" class="input-select">
            ${LENGTH_OPTIONS.map((ln) => `<option value="${ln.id}" ${ui.detailLength === ln.id ? 'selected' : ''}>${esc(ln.label)}</option>`).join('')}
          </select>
        </div>
      </div>`
        : ''
    }

    <div class="form-row-2">
      <button type="button" class="btn btn-secondary full-width" id="detailAskChatBtn">
        Ask Salon About Style
      </button>
      <button type="button" class="btn btn-primary full-width" id="detailBookNowBtn">
        Book Now — ${formatPula(price)}
      </button>
    </div>
  `;

  document.getElementById('detailSizeSel')?.addEventListener('change', (e) => {
    ui.detailSize = e.target.value;
    renderServiceDetailModal();
  });
  document.getElementById('detailLenSel')?.addEventListener('change', (e) => {
    ui.detailLength = e.target.value;
    renderServiceDetailModal();
  });
  document.getElementById('detailBookNowBtn')?.addEventListener('click', () => {
    closeModal('styleDetailModal');
    jumpToBook(s.id, ui.detailSize, ui.detailLength);
  });
  document.getElementById('detailAskChatBtn')?.addEventListener('click', () => {
    closeModal('styleDetailModal');
    const msg = `Hi Nicole! I would like to ask about "${s.name}" (${ui.detailSize}, ${ui.detailLength} — ${formatPula(price)}).`;
    store.sendMessage({
      threadId: 'thread-nicole',
      sender: 'client',
      senderName: 'Client',
      text: msg,
      image: s.image,
      styleName: s.name
    });
    switchTab('messages');
    triggerAutoSalonAssistant(msg, s.name);
  });
}

/* ================= VIEW 2: OFFICIAL PRICE LIST & ESTIMATOR ================= */
function renderPricesView() {
  const tbody = document.getElementById('priceMatrixBody');
  if (tbody) {
    tbody.innerHTML = SIZE_OPTIONS.map((sz) => {
      const row = OFFICIAL_PRICE_MATRIX[sz.id];
      return `
        <tr>
          <td><strong>${esc(sz.label)}</strong></td>
          <td><button type="button" class="price-cell-btn" data-matrix-book="${sz.id}:midback">${formatPula(row.midback)}</button></td>
          <td><button type="button" class="price-cell-btn" data-matrix-book="${sz.id}:butt">${formatPula(row.butt)}</button></td>
          <td><button type="button" class="price-cell-btn" data-matrix-book="${sz.id}:knee">${formatPula(row.knee)}</button></td>
          <td class="hide-xs muted-text">${esc(PACKS_BY_SIZE[sz.id] || '5–6 packs')}</td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-matrix-book]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const [sizeId, lengthId] = btn.dataset.matrixBook.split(':');
        jumpToBook('style-01', sizeId, lengthId);
      });
    });
  }

  const estSizeSel = document.getElementById('estSizeSelect');
  const estLenSel = document.getElementById('estLengthSelect');
  if (estSizeSel && !estSizeSel.options.length) {
    estSizeSel.innerHTML = SIZE_OPTIONS.map((s) => `<option value="${s.id}">${esc(s.label)}</option>`).join('');
  }
  if (estLenSel && !estLenSel.options.length) {
    estLenSel.innerHTML = LENGTH_OPTIONS.map((l) => `<option value="${l.id}">${esc(l.label)}</option>`).join('');
  }
  if (estSizeSel) estSizeSel.value = ui.estSize;
  if (estLenSel) estLenSel.value = ui.estLength;

  const estPrice = OFFICIAL_PRICE_MATRIX[ui.estSize]?.[ui.estLength] ?? 180;
  const estDeposit = Math.round(estPrice * 0.3);
  const estBox = document.getElementById('estimatorSummaryBox');
  if (estBox) {
    estBox.innerHTML = `
      <div class="est-row"><span>Estimated Duration</span><strong>${DURATION_BY_SIZE[ui.estSize]}</strong></div>
      <div class="est-row"><span>Hair Packs to Bring</span><strong>${PACKS_BY_SIZE[ui.estSize]}</strong></div>
      <div class="est-row"><span>30% Chair Deposit</span><strong>${formatPula(estDeposit)}</strong></div>
      <div class="est-row highlight"><span>Official Salon Price</span><strong>${formatPula(estPrice)}</strong></div>
    `;
  }
}

/* ================= VIEW 3: BOOKING & SLOT AVAILABILITY ================= */
function jumpToBook(styleId, sizeId = 'medium', lengthId = 'midback') {
  ui.bookStyleId = styleId;
  ui.bookSize = sizeId || 'medium';
  ui.bookLength = lengthId || 'midback';
  switchTab('book');
  renderBookingView();
}

function getBookingCalculation() {
  const availableStyles = store.state.styles.filter((s) => s.active !== false);
  const style =
    availableStyles.find((s) => s.id === ui.bookStyleId) ||
    availableStyles[0] ||
    store.state.styles[0];
  const basePrice = calculateStylePrice(style, ui.bookSize, ui.bookLength);
  const selectedAddOns = ADD_ONS.filter((a) => ui.bookAddOnIds.has(a.id));
  const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0);
  const subtotal = basePrice + addOnsTotal;
  const discount = ui.appliedPromo
    ? Math.round(subtotal * (Number(ui.appliedPromo.discountPercent || 0) / 100))
    : 0;
  const total = Math.max(50, subtotal - discount);
  const deposit = Math.round(total * 0.3);
  return { style, basePrice, selectedAddOns, addOnsTotal, subtotal, discount, total, deposit };
}

function ensureOpenTimeSlot() {
  if (store.isSlotBooked(ui.bookStylistId, ui.bookDate, ui.bookTime)) {
    const free = TIME_SLOTS.find((t) => !store.isSlotBooked(ui.bookStylistId, ui.bookDate, t));
    if (free) ui.bookTime = free;
  }
}

function renderBookingView() {
  const styles = store.state.styles.filter((s) => s.active !== false);
  if (!styles.some((s) => s.id === ui.bookStyleId) && styles[0]) {
    ui.bookStyleId = styles[0].id;
  }
  ensureOpenTimeSlot();

  const { style, basePrice, addOnsTotal, discount, total, deposit } = getBookingCalculation();

  const styleSel = document.getElementById('bookStyleSelect');
  if (styleSel) {
    styleSel.innerHTML = styles
      .map(
        (s) =>
          `<option value="${esc(s.id)}" ${s.id === ui.bookStyleId ? 'selected' : ''}>${esc(s.name)} — ${formatPula(
            calculateStylePrice(s, s.defaultSize, s.defaultLength)
          )}</option>`
      )
      .join('');
  }

  const preview = document.getElementById('bookSelectedPreview');
  if (preview && style) {
    preview.innerHTML = `
      <img src="${esc(style.image)}" alt="${esc(style.name)}" />
      <div style="flex:1">
        <strong style="display:block;">${esc(style.name)}</strong>
        <span class="muted-text">${esc(style.duration)} • Bring ${esc(style.packs)}</span>
      </div>
      <strong style="font-size:17px;color:var(--accent);">${formatPula(basePrice)}</strong>
    `;
  }

  const matrixWrap = document.getElementById('bookMatrixSelectors');
  if (matrixWrap) {
    matrixWrap.classList.toggle('hidden', style?.pricingMode === 'flat');
  }

  const sizeSel = document.getElementById('bookSizeSelect');
  if (sizeSel) {
    sizeSel.innerHTML = SIZE_OPTIONS.map(
      (sz) => `<option value="${sz.id}" ${ui.bookSize === sz.id ? 'selected' : ''}>${esc(sz.label)}</option>`
    ).join('');
  }

  const lenSel = document.getElementById('bookLengthSelect');
  if (lenSel) {
    lenSel.innerHTML = LENGTH_OPTIONS.map(
      (ln) => `<option value="${ln.id}" ${ui.bookLength === ln.id ? 'selected' : ''}>${esc(ln.label)}</option>`
    ).join('');
  }

  const colSel = document.getElementById('bookColorSelect');
  if (colSel) {
    colSel.innerHTML = HAIR_COLORS.map(
      (c) => `<option value="${c.id}" ${ui.bookColorId === c.id ? 'selected' : ''}>${esc(c.code)} — ${esc(c.name)}</option>`
    ).join('');
  }

  const stylistGrid = document.getElementById('bookStylistGrid');
  if (stylistGrid) {
    stylistGrid.innerHTML = STYLISTS.map(
      (st) => `
      <button type="button" class="braider-card ${ui.bookStylistId === st.id ? 'active' : ''}" data-bk-chair="${st.id}">
        <img src="${esc(st.avatar)}" alt="${esc(st.name)}" />
        <div>
          <strong>${esc(st.name)}</strong>
          <span>${esc(st.chair)} • ★ ${st.rating}</span>
        </div>
      </button>`
    ).join('');
    stylistGrid.querySelectorAll('[data-bk-chair]').forEach((b) => {
      b.addEventListener('click', () => {
        ui.bookStylistId = b.dataset.bkChair;
        renderBookingView();
      });
    });
  }

  const dateStrip = document.getElementById('bookDateStrip');
  if (dateStrip) {
    dateStrip.innerHTML = getUpcomingDates(14)
      .map(
        (d) => `
      <button type="button" class="date-btn ${ui.bookDate === d.iso ? 'active' : ''}" data-bk-date="${d.iso}">
        <span>${esc(d.dayName)}</span>
        <strong>${d.dayNum}</strong>
        <span>${esc(d.month)}</span>
      </button>`
      )
      .join('');
    dateStrip.querySelectorAll('[data-bk-date]').forEach((b) => {
      b.addEventListener('click', () => {
        ui.bookDate = b.dataset.bkDate;
        renderBookingView();
      });
    });
  }

  const slotsGrid = document.getElementById('bookSlotsGrid');
  if (slotsGrid) {
    slotsGrid.innerHTML = TIME_SLOTS.map((t) => {
      const taken = store.isSlotBooked(ui.bookStylistId, ui.bookDate, t);
      const isSelected = !taken && ui.bookTime === t;
      return `
        <button type="button" class="slot-btn ${isSelected ? 'active' : ''}" data-bk-slot="${t}" ${taken ? 'disabled title="Already booked"' : ''}>
          ${t}${taken ? ' • Booked' : ''}
        </button>`;
    }).join('');
    slotsGrid.querySelectorAll('[data-bk-slot]').forEach((b) => {
      b.addEventListener('click', () => {
        ui.bookTime = b.dataset.bkSlot;
        renderBookingView();
      });
    });
  }

  const addonsList = document.getElementById('bookAddonsList');
  if (addonsList) {
    addonsList.innerHTML = ADD_ONS.map((a) => {
      const on = ui.bookAddOnIds.has(a.id);
      return `
        <div class="addon-item ${on ? 'active' : ''}" data-bk-addon="${a.id}">
          <div>
            <strong style="font-size:13px;">${esc(a.name)}</strong>
            <span class="muted-inline"> • ${esc(a.tag)}</span>
          </div>
          <strong>+${formatPula(a.price)}</strong>
        </div>`;
    }).join('');
    addonsList.querySelectorAll('[data-bk-addon]').forEach((row) => {
      row.addEventListener('click', () => {
        const id = row.dataset.bkAddon;
        if (ui.bookAddOnIds.has(id)) ui.bookAddOnIds.delete(id);
        else ui.bookAddOnIds.add(id);
        renderBookingView();
      });
    });
  }

  const promoMsg = document.getElementById('promoFeedbackText');
  if (promoMsg) {
    promoMsg.textContent = ui.appliedPromo
      ? `Promo applied: ${ui.appliedPromo.code} (${ui.appliedPromo.discountPercent}% OFF)`
      : '';
  }

  const sumRows = document.getElementById('bookingSummaryRows');
  if (sumRows) {
    sumRows.innerHTML = `
      <div class="sum-row"><span>Service Price</span><strong>${formatPula(basePrice)}</strong></div>
      ${addOnsTotal ? `<div class="sum-row"><span>Selected Extras</span><strong>+${formatPula(addOnsTotal)}</strong></div>` : ''}
      ${discount ? `<div class="sum-row" style="color:var(--success)"><span>Discount (${esc(ui.appliedPromo.code)})</span><strong>-${formatPula(discount)}</strong></div>` : ''}
      <div class="sum-row total"><span>Total Amount</span><strong>${formatPula(total)}</strong></div>
      <div class="sum-row"><span>30% Deposit to Confirm</span><strong>${formatPula(deposit)}</strong></div>
    `;
  }

  renderClientBookingsLookup();
}

function renderClientBookingsLookup() {
  const listEl = document.getElementById('clientBookingsList');
  const lookupInp = document.getElementById('lookupPhoneInput');
  if (!listEl) return;

  if (!ui.lookupPhone) {
    const saved = store.getSavedClientPhone();
    if (saved) {
      ui.lookupPhone = saved;
      if (lookupInp && !lookupInp.value) lookupInp.value = saved;
    }
  }

  const cleanLookup = normalizePhoneClient(ui.lookupPhone);
  if (!cleanLookup) {
    listEl.innerHTML = `<p class="muted-text">Enter your phone number above to look up your appointments.</p>`;
    return;
  }

  const matches = store.state.bookings.filter(
    (b) => normalizePhoneClient(b.clientPhone) === cleanLookup
  );

  if (!matches.length) {
    listEl.innerHTML = `<p class="muted-text">No bookings found for "${esc(ui.lookupPhone)}".</p>`;
    return;
  }

  listEl.innerHTML = matches
    .map(
      (b) => `
      <div class="client-bk-card">
        <div class="client-bk-head">
          <strong>${esc(b.id)}</strong>
          <span class="status-pill status-${getStatusSlug(b.status)}">${esc(b.status)}</span>
        </div>
        <div>
          <strong style="display:block;font-size:13.5px;">${esc(b.styleName)}</strong>
          <span class="muted-text">${esc(b.date)} at ${esc(b.time)} • ${esc(b.stylistName)} • ${formatPula(b.total)}</span>
        </div>
        <div class="form-row-2">
          <button type="button" class="btn btn-secondary btn-sm" data-open-receipt="${esc(b.id)}">Receipt</button>
          ${
            b.status !== 'Cancelled' && b.status !== 'Completed'
              ? `<button type="button" class="btn btn-danger-outline btn-sm" data-cancel-bk="${esc(b.id)}">Cancel</button>`
              : `<a href="https://wa.me/${SALON_INFO.phoneIntl}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">WhatsApp</a>`
          }
        </div>
      </div>`
    )
    .join('');

  listEl.querySelectorAll('[data-open-receipt]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const bk = store.state.bookings.find((x) => x.id === btn.dataset.openReceipt);
      if (bk) openReceiptModal(bk);
    });
  });
  listEl.querySelectorAll('[data-cancel-bk]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await store.updateBookingStatus(btn.dataset.cancelBk, { status: 'Cancelled' });
      showToast('Appointment cancelled & time slot released');
    });
  });
}

function openReceiptModal(bk) {
  const host = document.getElementById('bookingPassContent');
  if (!host) return;

  const waUrl = `https://wa.me/${SALON_INFO.phoneIntl}?text=${encodeURIComponent(
    `Hello Nicole Beauty Parlour! Confirming my appointment ${bk.id}:\n• Service: ${bk.styleName} (${bk.sizeLabel || 'Medium'}, ${bk.lengthLabel || 'Midback'})\n• Shade: ${bk.hairColor || '#1B'}\n• Braider: ${bk.stylistName}\n• Date & Time: ${bk.date} at ${bk.time}\n• Total: P${bk.total} (30% Deposit: P${bk.deposit} via ${bk.paymentMethod})`
  )}`;

  host.innerHTML = `
    <h3 class="mb-12">Booking Confirmation</h3>
    <div class="receipt-box">
      <div class="receipt-head">
        <img src="/images/nicole-wordmark-light.png" alt="Nicole Beauty Parlour" />
        <span class="status-pill status-${getStatusSlug(bk.status)}">${esc(bk.id)} • ${esc(bk.status)}</span>
      </div>
      <div class="receipt-grid">
        <div><span>Client</span><strong>${esc(bk.clientName)}</strong></div>
        <div><span>Phone</span><strong>${esc(bk.clientPhone)}</strong></div>
        <div><span>Service</span><strong>${esc(bk.styleName)}</strong></div>
        <div><span>Size &amp; Length</span><strong>${esc(bk.sizeLabel || 'Standard')} • ${esc(bk.lengthLabel || '')}</strong></div>
        <div><span>Braider</span><strong>${esc(bk.stylistName)}</strong></div>
        <div><span>Date &amp; Time</span><strong>${esc(bk.date)} • ${esc(bk.time)}</strong></div>
        <div><span>Total Price</span><strong>${formatPula(bk.total)}</strong></div>
        <div><span>30% Deposit (${bk.depositPaid ? 'Paid' : 'Send to 72517904'})</span><strong>${formatPula(bk.deposit)}</strong></div>
      </div>
    </div>

    <div class="form-row-2 mt-14">
      <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary full-width">
        Send Receipt on WhatsApp
      </a>
      <button type="button" class="btn btn-secondary full-width" id="closeReceiptDoneBtn">
        Done
      </button>
    </div>
  `;

  document.getElementById('closeReceiptDoneBtn')?.addEventListener('click', () => {
    closeModal('bookingPassModal');
  });
  openModal('bookingPassModal');
}

/* ================= VIEW 4: DIRECT SALON CHAT ================= */
function scrollChatBottom() {
  const el = document.getElementById('chatMessagesStream');
  if (el) el.scrollTop = el.scrollHeight;
}

function triggerAutoSalonAssistant(userText, styleName = '') {
  setTimeout(() => {
    const reply = store.generateLocalSalonReply(userText, styleName);
    store.sendMessage({
      threadId: 'thread-nicole',
      sender: 'salon',
      senderName: 'Nicole',
      text: reply
    });
    scrollChatBottom();
  }, 550);
}

function renderMessenger() {
  const unlocked = store.isAdmin();
  if (!unlocked) ui.senderMode = 'client';

  document.getElementById('roleModeSwitchWrap')?.classList.toggle('hidden', !unlocked);
  document.getElementById('chatOwnerModeTag')?.classList.toggle('hidden', ui.senderMode !== 'salon');
  document.getElementById('modeClientBtn')?.classList.toggle('active', ui.senderMode === 'client');
  document.getElementById('modeSalonBtn')?.classList.toggle('active', ui.senderMode === 'salon');

  const input = document.getElementById('chatMessageInput');
  if (input) {
    input.placeholder =
      ui.senderMode === 'salon'
        ? 'Reply to client as Nicole Beauty Parlour...'
        : 'Ask about prices, hair packs, or send a reference hairstyle photo...';
  }

  const thread =
    store.state.threads.find((t) => t.id === 'thread-nicole') || store.state.threads[0];
  const stream = document.getElementById('chatMessagesStream');
  if (stream && thread) {
    stream.innerHTML = thread.messages
      .map((m) => {
        const fromClient = m.sender === 'client';
        return `
          <div class="msg-row ${fromClient ? 'from-client' : 'from-salon'}">
            <div class="msg-bubble">
              ${m.image ? `<img src="${esc(m.image)}" alt="Attachment" />` : ''}
              <div>${esc(m.text)}</div>
            </div>
            <span class="msg-meta">${esc(m.senderName || (fromClient ? 'Client' : 'Nicole'))} • ${esc(m.timestamp || '')}</span>
          </div>`;
      })
      .join('');
  }

  const unread = store.state.threads.reduce((sum, t) => sum + Number(t.unread || 0), 0);
  ['navUnreadBadge', 'desktopUnreadBadge'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = String(unread);
      el.classList.toggle('hidden', unread === 0);
    }
  });
}

/* ================= VIEW 5: PROTECTED ADMIN PANEL ================= */
function getStatusSlug(status = '') {
  const s = status.toLowerCase();
  if (s.includes('chair')) return 'inchair';
  if (s.includes('complete')) return 'completed';
  if (s.includes('cancel')) return 'cancelled';
  return 'confirmed';
}

function syncAdminAuthUi() {
  const unlocked = store.isAdmin();
  document.getElementById('adminLoginGate')?.classList.toggle('hidden', unlocked);
  document.getElementById('adminUnlockedSuite')?.classList.toggle('hidden', !unlocked);

  const topBtn = document.getElementById('topbarAdminBtn');
  const topLbl = document.getElementById('topbarAdminLabel');
  const topDot = document.getElementById('topbarAdminDot');
  const dockDot = document.getElementById('adminDockBadge');

  topBtn?.classList.toggle('unlocked', unlocked);
  if (topLbl) topLbl.textContent = unlocked ? 'Admin' : 'Admin';
  topDot?.classList.toggle('hidden', !unlocked);
  dockDot?.classList.toggle('unlocked', unlocked);

  if (unlocked && store.adminSession?.admin) {
    const adm = store.adminSession.admin;
    const badge = document.getElementById('adminIdentityBadge');
    if (badge) badge.textContent = `${adm.name || 'Nicole'} • +267 ${adm.phone}`;
    const nm = document.getElementById('credOwnerNameInput');
    const ph = document.getElementById('credNewPhoneInput');
    if (nm && !nm.value) nm.value = adm.name || 'Nicole • Parlour Owner';
    if (ph && !ph.value) ph.value = adm.phone || '72517904';
  }
}

function renderAdminView() {
  syncAdminAuthUi();
  if (!store.isAdmin()) return;

  document.querySelectorAll('.admin-tab[data-admin-pane]').forEach((b) => {
    b.classList.toggle('active', b.dataset.adminPane === ui.adminPane);
  });
  document.querySelectorAll('.admin-pane').forEach((p) => {
    p.classList.toggle('hidden', p.id !== `admin-pane-${ui.adminPane}`);
  });

  const styles = store.state.styles;
  const promos = store.state.promotions;
  const bookings = store.state.bookings;
  const activeBookings = bookings.filter((b) => b.status !== 'Cancelled');

  const bookedVolume = activeBookings.reduce((s, b) => s + Number(b.total || 0), 0);
  const completedRevenue = bookings
    .filter((b) => b.status === 'Completed')
    .reduce((s, b) => s + Number(b.total || 0), 0);
  const depositsPaid = activeBookings
    .filter((b) => b.depositPaid)
    .reduce((s, b) => s + Number(b.deposit || Math.round((b.total || 0) * 0.3)), 0);
  const depositsPending = activeBookings
    .filter((b) => !b.depositPaid && b.status !== 'Completed')
    .reduce((s, b) => s + Number(b.deposit || Math.round((b.total || 0) * 0.3)), 0);

  const setText = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(v);
  };
  setText('adminTabBookingsCount', bookings.length);
  setText('adminTabStylesCount', styles.length);

  // KPIs
  const kpiEl = document.getElementById('studioStatsGrid');
  if (kpiEl) {
    kpiEl.innerHTML = `
      <div class="kpi-card">
        <span>Active Appointments</span>
        <strong>${activeBookings.length}</strong>
        <small>${bookings.filter((b) => b.status === 'In Chair').length} currently in chair</small>
      </div>
      <div class="kpi-card">
        <span>Total Booked Value</span>
        <strong>${formatPula(bookedVolume)}</strong>
        <small>Completed: ${formatPula(completedRevenue)}</small>
      </div>
      <div class="kpi-card">
        <span>Deposits Collected</span>
        <strong style="color:var(--success)">${formatPula(depositsPaid)}</strong>
        <small>Pending deposits: ${formatPula(depositsPending)}</small>
      </div>
      <div class="kpi-card">
        <span>Active Services</span>
        <strong>${styles.filter((s) => s.active !== false).length} / ${styles.length}</strong>
        <small>${promos.filter((p) => p.active).length} active promo codes</small>
      </div>
    `;
  }

  // Pane 1: Upcoming Schedule & Braider Workload
  const recentEl = document.getElementById('adminRecentBookingsPreview');
  if (recentEl) {
    const upcoming = activeBookings.slice(0, 6);
    recentEl.innerHTML = upcoming.length
      ? upcoming
          .map(
            (bk) => `
        <div class="admin-row">
          <div class="admin-row-main">
            <img src="${esc(bk.styleImage || '/images/style-01-honey-curly-knotless.jpg')}" alt="${esc(bk.styleName)}" />
            <div>
              <strong>${esc(bk.clientName)} • ${esc(bk.date)} at ${esc(bk.time)}</strong>
              <span>${esc(bk.styleName)} • ${esc(bk.stylistName)} • ${formatPula(bk.total)}</span>
            </div>
          </div>
          <span class="status-pill status-${getStatusSlug(bk.status)}">${esc(bk.status)}</span>
        </div>`
          )
          .join('')
      : `<p class="muted-text">No upcoming bookings yet.</p>`;
  }

  const workloadEl = document.getElementById('adminChairAnalytics');
  if (workloadEl) {
    const maxRev = Math.max(
      400,
      ...STYLISTS.map((st) =>
        activeBookings
          .filter((b) => b.stylistId === st.id)
          .reduce((s, b) => s + Number(b.total || 0), 0)
      )
    );
    workloadEl.innerHTML = STYLISTS.map((st) => {
      const list = activeBookings.filter((b) => b.stylistId === st.id);
      const rev = list.reduce((s, b) => s + Number(b.total || 0), 0);
      const pct = Math.min(100, Math.max(8, Math.round((rev / maxRev) * 100)));
      return `
        <div class="workload-card">
          <div class="workload-top">
            <strong>${esc(st.chair)} • ${esc(st.name)}</strong>
            <strong>${formatPula(rev)}</strong>
          </div>
          <div class="workload-bar"><div class="workload-fill" style="width:${pct}%"></div></div>
          <span class="muted-text">${list.length} appointment${list.length === 1 ? '' : 's'} • ${esc(st.specialty)}</span>
        </div>`;
    }).join('');
  }

  // Pane 2: Bookings & Deposits Tracker
  const bkListEl = document.getElementById('studioBookingsList');
  if (bkListEl) {
    const bq = ui.adminBookingQuery.trim().toLowerCase();
    const filtered = bookings.filter((bk) => {
      if (ui.adminBookingStatus !== 'All' && bk.status !== ui.adminBookingStatus) return false;
      if (!bq) return true;
      return (
        (bk.clientName || '').toLowerCase().includes(bq) ||
        (bk.clientPhone || '').toLowerCase().includes(bq) ||
        (bk.id || '').toLowerCase().includes(bq) ||
        (bk.styleName || '').toLowerCase().includes(bq)
      );
    });

    bkListEl.innerHTML = filtered.length
      ? filtered
          .map((bk) => {
            const digits = normalizePhoneClient(bk.clientPhone);
            const waPhone = digits.length === 8 ? `267${digits}` : digits || SALON_INFO.phoneIntl;
            const depAmt = bk.deposit || Math.round((bk.total || 0) * 0.3);
            return `
          <div class="admin-row">
            <div class="admin-row-main">
              <img src="${esc(bk.styleImage || '/images/style-01-honey-curly-knotless.jpg')}" alt="${esc(bk.styleName)}" />
              <div>
                <strong>${esc(bk.clientName)} (${esc(bk.clientPhone || 'Walk-in')}) • ${esc(bk.id)}</strong>
                <span>${esc(bk.styleName)} • ${esc(bk.date)} ${esc(bk.time)} • ${esc(bk.stylistName)} • <strong>${formatPula(bk.total)}</strong></span>
              </div>
            </div>
            <div class="admin-row-actions">
              <button type="button" class="deposit-btn ${bk.depositPaid ? 'paid' : 'unpaid'}" data-toggle-dep="${esc(bk.id)}">
                ${bk.depositPaid ? `Dep Paid (${formatPula(depAmt)})` : `Dep Unpaid (${formatPula(depAmt)})`}
              </button>
              <select class="input-select input-sm" style="width:130px" data-status-sel="${esc(bk.id)}">
                ${['Confirmed', 'In Chair', 'Completed', 'Cancelled']
                  .map((st) => `<option value="${st}" ${bk.status === st ? 'selected' : ''}>${st}</option>`)
                  .join('')}
              </select>
              <button type="button" class="btn btn-secondary btn-sm" data-admin-receipt="${esc(bk.id)}">Receipt</button>
              <a href="https://wa.me/${waPhone}?text=${encodeURIComponent(`Hello ${bk.clientName}, Nicole Beauty Parlour here regarding your booking ${bk.id} (${bk.styleName} on ${bk.date} at ${bk.time}).`)}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">WhatsApp</a>
            </div>
          </div>`;
          })
          .join('')
      : `<p class="muted-text">No bookings match your search.</p>`;

    bkListEl.querySelectorAll('[data-toggle-dep]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const bk = bookings.find((x) => x.id === btn.dataset.toggleDep);
        if (!bk) return;
        await store.updateBookingStatus(bk.id, { depositPaid: !bk.depositPaid });
        showToast(bk.depositPaid ? 'Deposit marked Paid' : 'Deposit marked Unpaid');
      });
    });
    bkListEl.querySelectorAll('[data-status-sel]').forEach((sel) => {
      sel.addEventListener('change', async (e) => {
        await store.updateBookingStatus(sel.dataset.statusSel, { status: e.target.value });
        showToast(`Status updated to ${e.target.value}`);
      });
    });
    bkListEl.querySelectorAll('[data-admin-receipt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const bk = bookings.find((x) => x.id === btn.dataset.adminReceipt);
        if (bk) openReceiptModal(bk);
      });
    });
  }

  // Pane 3: Services & Prices Editor
  const stListEl = document.getElementById('studioStylesList');
  if (stListEl) {
    const sq = ui.adminStyleQuery.trim().toLowerCase();
    const filteredStyles = styles.filter(
      (s) => !sq || s.name.toLowerCase().includes(sq) || (s.category || '').toLowerCase().includes(sq)
    );

    stListEl.innerHTML = filteredStyles
      .map((s) => {
        const isAvailable = s.active !== false;
        const p = calculateStylePrice(s, s.defaultSize, s.defaultLength);
        return `
        <div class="admin-row">
          <div class="admin-row-main">
            <img src="${esc(s.image)}" alt="${esc(s.name)}" />
            <div>
              <strong>${esc(s.name)} ${!isAvailable ? '(Hidden)' : ''}</strong>
              <span>${esc(s.category)} • ${s.pricingMode === 'flat' ? `Flat ${formatPula(p)}` : `From ${formatPula(p)}`} • ${esc(s.duration)} • ${esc(s.packs)}</span>
            </div>
          </div>
          <div class="admin-row-actions">
            <button type="button" class="btn btn-secondary btn-sm" data-toggle-style-vis="${esc(s.id)}">
              ${isAvailable ? 'Hide' : 'Show'}
            </button>
            <button type="button" class="btn btn-secondary btn-sm" data-edit-style="${esc(s.id)}">
              Edit Price
            </button>
            <button type="button" class="btn btn-danger-outline btn-sm" data-del-style="${esc(s.id)}">
              Delete
            </button>
          </div>
        </div>`;
      })
      .join('');

    stListEl.querySelectorAll('[data-toggle-style-vis]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const st = styles.find((x) => x.id === btn.dataset.toggleStyleVis);
        if (!st) return;
        const next = st.active === false;
        await store.updateStyle(st.id, { active: next });
        showToast(next ? 'Service visible to clients' : 'Service hidden from public catalog');
      });
    });
    stListEl.querySelectorAll('[data-edit-style]').forEach((btn) => {
      btn.addEventListener('click', () => openEditStyleModal(btn.dataset.editStyle));
    });
    stListEl.querySelectorAll('[data-del-style]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (styles.length <= 2) {
          showToast('Keep at least 2 services in catalog');
          return;
        }
        await store.deleteStyle(btn.dataset.delStyle);
        showToast('Service deleted');
      });
    });
  }

  // Pane 4: Auto-built Client CRM Directory & Live Inbox
  const crmEl = document.getElementById('adminClientsDirectory');
  if (crmEl) {
    const clientMap = new Map();
    bookings.forEach((b) => {
      const key = normalizePhoneClient(b.clientPhone) || b.clientName;
      if (!key) return;
      const existing = clientMap.get(key) || {
        name: b.clientName,
        phone: b.clientPhone || '',
        visits: 0,
        spent: 0,
        lastStyle: b.styleName
      };
      if (b.status !== 'Cancelled') {
        existing.visits += 1;
        existing.spent += Number(b.total || 0);
      }
      clientMap.set(key, existing);
    });

    const clients = Array.from(clientMap.values()).sort((a, b) => b.spent - a.spent);
    crmEl.innerHTML = clients.length
      ? clients
          .map((c) => {
            const d = normalizePhoneClient(c.phone);
            const wa = d.length === 8 ? `267${d}` : d || SALON_INFO.phoneIntl;
            return `
          <div class="admin-row">
            <div>
              <strong style="display:block;">${esc(c.name)}</strong>
              <span class="muted-text">${esc(c.phone)} • ${c.visits} visit${c.visits === 1 ? '' : 's'} • Total: <strong>${formatPula(c.spent)}</strong></span>
            </div>
            <div class="admin-row-actions">
              ${d ? `<a href="tel:+267${d}" class="btn btn-secondary btn-sm">Call</a>` : ''}
              <a href="https://wa.me/${wa}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">WhatsApp</a>
            </div>
          </div>`;
          })
          .join('')
      : `<p class="muted-text">Client profiles appear automatically as appointments are booked.</p>`;
  }

  const inboxEl = document.getElementById('adminInboxSummary');
  if (inboxEl) {
    const thread = store.state.threads.find((t) => t.id === 'thread-nicole') || store.state.threads[0];
    const recentMsgs = (thread?.messages || []).slice(-4).reverse();
    inboxEl.innerHTML = recentMsgs
      .map(
        (m) => `
      <div class="admin-row">
        <div>
          <strong style="display:block;font-size:13px;">${esc(m.senderName || m.sender)} • ${esc(m.timestamp || '')}</strong>
          <span class="muted-text">${esc((m.text || '').slice(0, 85))}</span>
        </div>
      </div>`
      )
      .join('');
  }

  // Pane 5: Promos & Flyer Studio
  const promoSel = document.getElementById('promoStyleSelect');
  if (promoSel) {
    promoSel.innerHTML = styles
      .map((s) => `<option value="${esc(s.id)}">${esc(s.name)}</option>`)
      .join('');
  }

  const promosEl = document.getElementById('studioPromosList');
  if (promosEl) {
    promosEl.innerHTML = promos
      .map(
        (p) => `
      <div class="admin-row">
        <div class="admin-row-main">
          <img src="${esc(p.image)}" alt="${esc(p.title)}" />
          <div>
            <strong>${esc(p.title)} (${esc(p.code)})</strong>
            <span>${p.discountPercent}% OFF • ${p.active ? 'Active' : 'Paused'}</span>
          </div>
        </div>
        <div class="admin-row-actions">
          <button type="button" class="btn btn-secondary btn-sm" data-flyer-promo="${esc(p.id)}">Flyer</button>
          <button type="button" class="btn btn-secondary btn-sm" data-toggle-promo="${esc(p.id)}">${p.active ? 'Pause' : 'Activate'}</button>
          <button type="button" class="btn btn-danger-outline btn-sm" data-del-promo="${esc(p.id)}">Delete</button>
        </div>
      </div>`
      )
      .join('');

    promosEl.querySelectorAll('[data-flyer-promo]').forEach((b) => {
      b.addEventListener('click', () => {
        const pr = promos.find((x) => x.id === b.dataset.flyerPromo);
        if (pr) openFlyerModal(pr);
      });
    });
    promosEl.querySelectorAll('[data-toggle-promo]').forEach((b) => {
      b.addEventListener('click', async () => {
        await store.togglePromotion(b.dataset.togglePromo);
        showToast('Promo updated');
      });
    });
    promosEl.querySelectorAll('[data-del-promo]').forEach((b) => {
      b.addEventListener('click', async () => {
        await store.deletePromotion(b.dataset.delPromo);
        showToast('Promo deleted');
      });
    });
  }
}

function openEditStyleModal(styleId) {
  const s = store.state.styles.find((x) => x.id === styleId);
  if (!s) return;
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };
  setVal('editStyleIdInput', s.id);
  setVal('editStyleNameInput', s.name || '');
  setVal('editStyleCategorySelect', s.category || 'Knotless');
  setVal('editStyleBadgeInput', s.badge || '');
  setVal('editStylePricingMode', s.pricingMode || 'matrix');
  setVal(
    'editStyleFlatPriceInput',
    s.pricingMode === 'flat' ? Number(s.flatPrice || 250) : Number(s.priceOffset || 0)
  );
  setVal('editStyleDurationInput', s.duration || '4 – 5 hrs');
  setVal('editStylePacksInput', s.packs || '5–6 packs');
  setVal('editStyleDescInput', s.description || '');
  const activeChk = document.getElementById('editStyleActiveCheck');
  if (activeChk) activeChk.checked = s.active !== false;
  openModal('editStyleModal');
}

function openWalkInModal() {
  const stSel = document.getElementById('walkInStyleSelect');
  if (stSel) {
    stSel.innerHTML = store.state.styles
      .map(
        (s) =>
          `<option value="${esc(s.id)}">${esc(s.name)} (${formatPula(
            calculateStylePrice(s, s.defaultSize, s.defaultLength)
          )})</option>`
      )
      .join('');
  }
  const chSel = document.getElementById('walkInStylistSelect');
  if (chSel) {
    chSel.innerHTML = STYLISTS.map(
      (st) => `<option value="${esc(st.id)}">${esc(st.chair)} • ${esc(st.name)}</option>`
    ).join('');
  }
  const dtInp = document.getElementById('walkInDateInput');
  if (dtInp && !dtInp.value) dtInp.value = new Date().toISOString().slice(0, 10);
  openModal('walkInModal');
}

function getDraftPromo() {
  const styleId = document.getElementById('promoStyleSelect')?.value || 'style-01';
  const st = store.state.styles.find((s) => s.id === styleId) || store.state.styles[0];
  const pct = Number(document.getElementById('promoDiscountInput')?.value || 15);
  return {
    title: document.getElementById('promoTitleInput')?.value.trim() || 'Special Salon Offer',
    subtitle:
      document.getElementById('promoSubtitleInput')?.value.trim() ||
      'Book your appointment at Nicole Beauty Parlour.',
    discountPercent: pct,
    code: (document.getElementById('promoCodeInput')?.value.trim() || 'NICOLE15').toUpperCase(),
    priceHighlight: document.getElementById('promoPriceHighlight')?.value.trim() || `${pct}% OFF`,
    theme: document.getElementById('promoThemeSelect')?.value || 'obsidian-sapphire',
    styleId: st?.id || 'style-01',
    image: st?.image || '/images/style-01-honey-curly-knotless.jpg',
    validUntil: '2026-12-31',
    badge: 'LIMITED OFFER'
  };
}

async function refreshPromoCanvas() {
  const canvas = document.getElementById('livePromoPreviewCanvas');
  if (!canvas) return;
  await renderPromoFlyerToCanvas(canvas, getDraftPromo());
}

async function openFlyerModal(promo) {
  ui.lastFlyerPromo = promo;
  const blob = await renderPromoFlyerBlob(promo);
  ui.lastFlyerBlob = blob;
  const img = document.getElementById('flyerPreviewImage');
  if (img && blob) img.src = URL.createObjectURL(blob);
  openModal('flyerModal');
}

function renderAll() {
  syncAdminAuthUi();
  renderServicesCatalog();
  renderPricesView();
  renderBookingView();
  renderMessenger();
  renderAdminView();
}

/* ================= GLOBAL EVENTS ================= */
function bindEvents() {
  document.getElementById('brandHomeBtn')?.addEventListener('click', () => switchTab('services'));

  document.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  document.querySelectorAll('[data-goto-tab]').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.gotoTab));
  });
  document.getElementById('topbarAdminBtn')?.addEventListener('click', () => switchTab('studio'));

  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
  });
  document.querySelectorAll('.modal-backdrop').forEach((bd) => {
    bd.addEventListener('click', (e) => {
      if (e.target === bd) closeModal(bd.id);
    });
  });

  // Catalog search & sort
  document.getElementById('serviceSearchInput')?.addEventListener('input', (e) => {
    ui.searchQuery = e.target.value;
    renderServicesCatalog();
  });
  document.getElementById('clearSearchBtn')?.addEventListener('click', () => {
    ui.searchQuery = '';
    const inp = document.getElementById('serviceSearchInput');
    if (inp) inp.value = '';
    renderServicesCatalog();
  });
  document.getElementById('serviceSortSelect')?.addEventListener('change', (e) => {
    ui.sortBy = e.target.value;
    renderServicesCatalog();
  });

  // Prices & Estimator
  document.getElementById('viewPosterPhotoBtn')?.addEventListener('click', () =>
    openModal('priceSheetModal')
  );
  document.getElementById('bookFlatSpecialtyBtn')?.addEventListener('click', () =>
    jumpToBook('style-13', 'medium', 'midback')
  );
  document.getElementById('estSizeSelect')?.addEventListener('change', (e) => {
    ui.estSize = e.target.value;
    renderPricesView();
  });
  document.getElementById('estLengthSelect')?.addEventListener('change', (e) => {
    ui.estLength = e.target.value;
    renderPricesView();
  });
  document.getElementById('estBookBtn')?.addEventListener('click', () =>
    jumpToBook('style-01', ui.estSize, ui.estLength)
  );

  // Booking form controls
  document.getElementById('bookStyleSelect')?.addEventListener('change', (e) => {
    ui.bookStyleId = e.target.value;
    const st = store.state.styles.find((s) => s.id === ui.bookStyleId);
    if (st) {
      ui.bookSize = st.defaultSize || 'medium';
      ui.bookLength = st.defaultLength || 'midback';
    }
    renderBookingView();
  });
  document.getElementById('bookSizeSelect')?.addEventListener('change', (e) => {
    ui.bookSize = e.target.value;
    renderBookingView();
  });
  document.getElementById('bookLengthSelect')?.addEventListener('change', (e) => {
    ui.bookLength = e.target.value;
    renderBookingView();
  });
  document.getElementById('bookColorSelect')?.addEventListener('change', (e) => {
    ui.bookColorId = e.target.value;
  });

  document.getElementById('applyPromoBtn')?.addEventListener('click', () => {
    const code = String(document.getElementById('bookPromoInput')?.value || '')
      .trim()
      .toUpperCase();
    const match = store.state.promotions.find((p) => p.active && p.code.toUpperCase() === code);
    if (!match) {
      ui.appliedPromo = null;
      showToast('Invalid or inactive promo code');
    } else {
      ui.appliedPromo = match;
      showToast(`${match.code} applied (${match.discountPercent}% OFF)`);
    }
    renderBookingView();
  });

  document.getElementById('bookingForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const clientName = document.getElementById('clientNameInput')?.value.trim();
    const clientPhone = document.getElementById('clientPhoneInput')?.value.trim();
    if (!clientName || !clientPhone) {
      showToast('Please enter your full name and phone number');
      return;
    }

    if (store.isSlotBooked(ui.bookStylistId, ui.bookDate, ui.bookTime)) {
      showToast('That time slot was just booked — please pick another available time');
      renderBookingView();
      return;
    }

    const { style, selectedAddOns, subtotal, discount, total, deposit } = getBookingCalculation();
    const sz = SIZE_OPTIONS.find((x) => x.id === ui.bookSize);
    const ln = LENGTH_OPTIONS.find((x) => x.id === ui.bookLength);
    const col = HAIR_COLORS.find((x) => x.id === ui.bookColorId) || HAIR_COLORS[0];
    const stylist = STYLISTS.find((x) => x.id === ui.bookStylistId) || STYLISTS[0];

    try {
      const created = await store.createBooking({
        clientName,
        clientPhone,
        styleId: style.id,
        styleName: style.name,
        styleImage: style.image,
        size: ui.bookSize,
        sizeLabel: sz?.label || 'Medium',
        length: ui.bookLength,
        lengthLabel: ln?.label || 'Midback',
        hairColor: `${col.code} ${col.name}`,
        stylistId: stylist.id,
        stylistName: stylist.name,
        date: ui.bookDate,
        time: ui.bookTime,
        addOns: selectedAddOns.map((a) => a.name),
        promoCode: ui.appliedPromo?.code || '',
        subtotal,
        discount,
        total,
        deposit,
        paymentMethod:
          document.getElementById('paymentMethodSelect')?.value || 'Orange Money (72517904)',
        notes: document.getElementById('bookingNotesInput')?.value.trim() || ''
      });

      ui.lookupPhone = clientPhone;
      const lk = document.getElementById('lookupPhoneInput');
      if (lk) lk.value = clientPhone;
      renderBookingView();
      openReceiptModal(created);
    } catch (err) {
      showToast(err.message || 'Could not complete booking');
    }
  });

  // Client phone lookup
  document.getElementById('lookupPhoneBtn')?.addEventListener('click', () => {
    ui.lookupPhone = document.getElementById('lookupPhoneInput')?.value.trim() || '';
    if (ui.lookupPhone) store.saveClientPhone(ui.lookupPhone);
    renderClientBookingsLookup();
  });

  // Direct Salon Chat
  document.getElementById('modeClientBtn')?.addEventListener('click', () => {
    ui.senderMode = 'client';
    renderMessenger();
  });
  document.getElementById('modeSalonBtn')?.addEventListener('click', () => {
    if (requireAdminAuth()) {
      ui.senderMode = 'salon';
      renderMessenger();
    }
  });

  document.querySelectorAll('#chatQuickChips [data-quick-msg]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const text = btn.dataset.quickMsg;
      store.sendMessage({
        threadId: 'thread-nicole',
        sender: 'client',
        senderName: 'Client',
        text
      });
      scrollChatBottom();
      triggerAutoSalonAssistant(text);
    });
  });

  document.getElementById('chatImageInput')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    ui.pendingChatAttachment = await compressImageFile(file, 840, 0.82);
    const bar = document.getElementById('chatAttachmentBar');
    if (bar) {
      bar.classList.remove('hidden');
      bar.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
          <img src="${ui.pendingChatAttachment}" alt="Photo" />
          <span class="muted-text">Photo attached</span>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" id="removeChatPhotoBtn">Remove</button>
      `;
      document.getElementById('removeChatPhotoBtn')?.addEventListener('click', () => {
        ui.pendingChatAttachment = null;
        bar.classList.add('hidden');
      });
    }
  });

  document.getElementById('chatComposerForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const inp = document.getElementById('chatMessageInput');
    const text = inp?.value.trim() || '';
    if (!text && !ui.pendingChatAttachment) return;

    const isClient = ui.senderMode === 'client';
    store.sendMessage({
      threadId: 'thread-nicole',
      sender: ui.senderMode,
      senderName: isClient ? 'Client' : 'Nicole',
      text: text || 'Sent a hairstyle reference photo',
      image: ui.pendingChatAttachment
    });

    if (inp) inp.value = '';
    ui.pendingChatAttachment = null;
    document.getElementById('chatAttachmentBar')?.classList.add('hidden');
    scrollChatBottom();

    if (isClient) triggerAutoSalonAssistant(text);
  });

  // ================= ADMIN LOGIN & MANAGEMENT EVENTS =================
  document.getElementById('toggleAdminPassBtn')?.addEventListener('click', (e) => {
    const inp = document.getElementById('adminPasswordInput');
    if (!inp) return;
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    e.currentTarget.textContent = show ? 'Hide' : 'Show';
  });

  document.getElementById('toggleStarterCredsBtn')?.addEventListener('click', () => {
    document.getElementById('starterCredsBox')?.classList.toggle('hidden');
  });

  document.getElementById('fillStarterCredsBtn')?.addEventListener('click', () => {
    const ph = document.getElementById('adminPhoneInput');
    const pw = document.getElementById('adminPasswordInput');
    if (ph) ph.value = '72517904';
    if (pw) pw.value = 'Nicole2026';
    document.getElementById('adminLoginError')?.classList.add('hidden');
  });

  document.getElementById('adminLoginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = document.getElementById('adminPhoneInput')?.value.trim() || '';
    const password = document.getElementById('adminPasswordInput')?.value || '';
    const remember = Boolean(document.getElementById('adminRememberCheckbox')?.checked);
    const errEl = document.getElementById('adminLoginError');
    const card = document.getElementById('adminVaultCard');
    const btn = document.getElementById('adminLoginSubmitBtn');

    errEl?.classList.add('hidden');
    if (btn) btn.disabled = true;
    const res = await store.loginAdmin({ phone, password, remember });
    if (btn) btn.disabled = false;

    if (!res.ok) {
      if (errEl) {
        errEl.textContent = res.error || 'Incorrect phone number or password.';
        errEl.classList.remove('hidden');
      }
      if (card) {
        card.classList.remove('shake');
        void card.offsetWidth;
        card.classList.add('shake');
      }
      return;
    }

    const pwInp = document.getElementById('adminPasswordInput');
    if (pwInp) pwInp.value = '';
    showToast('Signed in to Admin Panel');
    renderAll();

    if (typeof ui.pendingAdminCallback === 'function') {
      const cb = ui.pendingAdminCallback;
      ui.pendingAdminCallback = null;
      cb();
    }
  });

  document.getElementById('adminLogoutBtn')?.addEventListener('click', () => {
    store.logoutAdmin();
    ui.senderMode = 'client';
    showToast('Signed out of Admin Panel');
    renderAll();
  });

  document.querySelectorAll('.admin-tab[data-admin-pane]').forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.adminPane = btn.dataset.adminPane;
      renderAdminView();
    });
  });
  document.querySelectorAll('[data-goto-admin-pane]').forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.adminPane = btn.dataset.gotoAdminPane;
      renderAdminView();
    });
  });

  document.getElementById('adminBookingSearchInput')?.addEventListener('input', (e) => {
    ui.adminBookingQuery = e.target.value;
    renderAdminView();
  });
  document.getElementById('adminBookingStatusFilter')?.addEventListener('change', (e) => {
    ui.adminBookingStatus = e.target.value;
    renderAdminView();
  });
  document.getElementById('adminStyleSearchInput')?.addEventListener('input', (e) => {
    ui.adminStyleQuery = e.target.value;
    renderAdminView();
  });

  // Add / Edit Service Modals
  const triggerAddService = () => requireAdminAuth(() => openModal('addStyleModal'));
  document.getElementById('studioAddStyleBtn')?.addEventListener('click', triggerAddService);
  document.getElementById('studioNewStyleInlineBtn')?.addEventListener('click', triggerAddService);

  document.getElementById('newStylePhotoInput')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    ui.newStyleImage = await compressImageFile(file, 920, 0.84);
    const img = document.getElementById('newStylePreviewImg');
    if (img) img.src = ui.newStyleImage;
  });

  document.getElementById('addStyleForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!requireAdminAuth()) return;
    const name = document.getElementById('newStyleName')?.value.trim();
    if (!name) return;
    const pricingMode = document.getElementById('newStylePricingMode')?.value || 'matrix';
    await store.addStyle({
      name,
      category: document.getElementById('newStyleCategory')?.value || 'Knotless',
      badge: document.getElementById('newStyleBadge')?.value.trim() || '',
      image: ui.newStyleImage,
      pricingMode,
      flatPrice:
        pricingMode === 'flat'
          ? Number(document.getElementById('newStyleFlatPrice')?.value || 250)
          : undefined,
      defaultSize: 'medium',
      defaultLength: 'midback',
      duration: document.getElementById('newStyleDuration')?.value.trim() || '4 – 5 hrs',
      packs: document.getElementById('newStylePacks')?.value.trim() || '5–6 packs',
      description: document.getElementById('newStyleDesc')?.value.trim() || '',
      active: true
    });
    closeModal('addStyleModal');
    e.target.reset();
    showToast(`"${name}" added to services`);
  });

  document.getElementById('editStyleForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!requireAdminAuth()) return;
    const id = document.getElementById('editStyleIdInput')?.value;
    if (!id) return;
    const pricingMode = document.getElementById('editStylePricingMode')?.value || 'matrix';
    const num = Number(document.getElementById('editStyleFlatPriceInput')?.value || 0);
    await store.updateStyle(id, {
      name: document.getElementById('editStyleNameInput')?.value.trim(),
      category: document.getElementById('editStyleCategorySelect')?.value,
      badge: document.getElementById('editStyleBadgeInput')?.value.trim(),
      pricingMode,
      flatPrice: pricingMode === 'flat' ? Math.max(50, num || 250) : undefined,
      priceOffset: pricingMode === 'matrix' ? num : 0,
      duration: document.getElementById('editStyleDurationInput')?.value.trim(),
      packs: document.getElementById('editStylePacksInput')?.value.trim(),
      description: document.getElementById('editStyleDescInput')?.value.trim(),
      active: Boolean(document.getElementById('editStyleActiveCheck')?.checked)
    });
    closeModal('editStyleModal');
    showToast('Service updated');
  });

  // Walk-in Booking Modal
  document.getElementById('adminOpenWalkInBtn')?.addEventListener('click', () =>
    requireAdminAuth(openWalkInModal)
  );
  document.getElementById('adminWalkInInlineBtn')?.addEventListener('click', () =>
    requireAdminAuth(openWalkInModal)
  );
  document.getElementById('walkInStyleSelect')?.addEventListener('change', (e) => {
    const st = store.state.styles.find((x) => x.id === e.target.value);
    const pr = document.getElementById('walkInPriceInput');
    if (st && pr) pr.value = String(calculateStylePrice(st, st.defaultSize, st.defaultLength));
  });
  document.getElementById('walkInForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!requireAdminAuth()) return;
    const clientName = document.getElementById('walkInClientName')?.value.trim();
    const clientPhone = document.getElementById('walkInClientPhone')?.value.trim();
    const styleId = document.getElementById('walkInStyleSelect')?.value;
    const stylistId = document.getElementById('walkInStylistSelect')?.value;
    const total = Math.max(50, Number(document.getElementById('walkInPriceInput')?.value || 250));
    const date = document.getElementById('walkInDateInput')?.value;
    const time = document.getElementById('walkInTimeSelect')?.value || '09:00';
    const status = document.getElementById('walkInStatusSelect')?.value || 'In Chair';
    const depositPaid = Boolean(document.getElementById('walkInDepositPaidCheck')?.checked);

    const style = store.state.styles.find((s) => s.id === styleId) || store.state.styles[0];
    const stylist = STYLISTS.find((s) => s.id === stylistId) || STYLISTS[0];

    try {
      await store.createBooking({
        clientName,
        clientPhone,
        styleId: style.id,
        styleName: style.name,
        styleImage: style.image,
        sizeLabel: 'Salon Desk',
        lengthLabel: 'Standard',
        stylistId: stylist.id,
        stylistName: stylist.name,
        date,
        time,
        subtotal: total,
        discount: 0,
        total,
        deposit: Math.round(total * 0.3),
        depositPaid,
        status,
        paymentMethod: 'Salon Desk / Walk-In'
      });
      closeModal('walkInModal');
      e.target.reset();
      ui.adminPane = 'bookings';
      renderAdminView();
      showToast('Walk-in appointment saved');
    } catch (err) {
      showToast(err.message || 'Time slot already booked');
    }
  });

  // Promos & Flyer
  const triggerPromoModal = () =>
    requireAdminAuth(() => {
      openModal('addPromoModal');
      refreshPromoCanvas();
    });
  document.getElementById('studioLaunchPromoBtn')?.addEventListener('click', triggerPromoModal);
  document.getElementById('studioNewAdInlineBtn')?.addEventListener('click', triggerPromoModal);

  [
    'promoTitleInput',
    'promoSubtitleInput',
    'promoCodeInput',
    'promoDiscountInput',
    'promoPriceHighlight',
    'promoThemeSelect',
    'promoStyleSelect'
  ].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', refreshPromoCanvas);
    document.getElementById(id)?.addEventListener('change', refreshPromoCanvas);
  });

  document.getElementById('addPromoForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!requireAdminAuth()) return;
    const created = await store.createPromotion(getDraftPromo());
    closeModal('addPromoModal');
    showToast(`Promo ${created.code} created`);
    await openFlyerModal(created);
  });

  document.getElementById('downloadFlyerBtn')?.addEventListener('click', () => {
    if (!ui.lastFlyerBlob) return;
    const url = URL.createObjectURL(ui.lastFlyerBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Nicole-Beauty-Parlour-${ui.lastFlyerPromo?.code || 'Offer'}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  });

  document.getElementById('shareFlyerBtn')?.addEventListener('click', () => {
    const p = ui.lastFlyerPromo;
    const text = encodeURIComponent(
      `${p?.title || 'Special Offer'} at Nicole Beauty Parlour! Use code ${p?.code || 'SLAY15'} — Book or WhatsApp ${SALON_INFO.phoneDisplay}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
  });

  // Jump to chat as Nicole
  document.getElementById('adminJumpToSalonChatBtn')?.addEventListener('click', () => {
    if (!requireAdminAuth()) return;
    ui.senderMode = 'salon';
    switchTab('messages');
    renderMessenger();
  });

  // Change Admin Phone & Password
  document.getElementById('adminCredentialsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!requireAdminAuth()) return;
    const ownerName = document.getElementById('credOwnerNameInput')?.value.trim();
    const newPhone = document.getElementById('credNewPhoneInput')?.value.trim();
    const currentPassword = document.getElementById('credCurrentPasswordInput')?.value || '';
    const newPassword = document.getElementById('credNewPasswordInput')?.value || '';
    const msgEl = document.getElementById('credFeedbackMsg');

    const res = await store.updateAdminCredentials({
      currentPassword,
      newPhone,
      newPassword,
      ownerName
    });
    if (!res.ok) {
      if (msgEl) {
        msgEl.style.color = '#f87171';
        msgEl.textContent = res.error || 'Could not update credentials';
      }
      return;
    }
    if (msgEl) {
      msgEl.style.color = '#34d399';
      msgEl.textContent = `Updated! Active login phone: ${res.admin.phone}`;
    }
    document.getElementById('credCurrentPasswordInput').value = '';
    document.getElementById('credNewPasswordInput').value = '';
    showToast('Admin credentials updated');
    renderAll();
  });
}

/* ================= SCREEN RESOLUTION & ANIMATED LOGO STARTUP ENGINE ================= */
function initViewportEngine() {
  const updateViewportVars = () => {
    const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--app-height', `${Math.round(vh)}px`);
  };
  updateViewportVars();
  window.addEventListener('resize', updateViewportVars, { passive: true });
  window.addEventListener('orientationchange', updateViewportVars, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateViewportVars, { passive: true });
  }
}

async function runAnimatedSplashScreen() {
  const splash = document.getElementById('splashLoader');
  if (!splash) {
    document.body.classList.remove('splash-locked');
    return;
  }

  const fillEl = document.getElementById('splashProgressFill');
  const pctEl = document.getElementById('splashPercentText');
  const statusEl = document.getElementById('splashStatusText');
  const imgs = Array.from(splash.querySelectorAll('img.anim-layer'));

  // Ensure all 7 transparent logo layers decode cleanly before frame 0 starts
  const decodeAll = Promise.all(
    imgs.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      if (typeof img.decode === 'function') return img.decode().catch(() => {});
      return new Promise((res) => {
        img.addEventListener('load', res, { once: true });
        img.addEventListener('error', res, { once: true });
      });
    })
  );
  await Promise.race([decodeAll, new Promise((r) => setTimeout(r, 550))]);

  // Trigger the 7-part choreographed logo animation
  splash.classList.add('is-playing');

  let dismissed = false;
  const finishSplash = () => {
    if (dismissed) return;
    dismissed = true;
    if (fillEl) fillEl.style.width = '100%';
    if (pctEl) pctEl.textContent = '100%';
    splash.classList.add('splash-exit');
    document.body.classList.remove('splash-locked');
    setTimeout(() => splash.remove(), 520);
  };

  // Allow tap-to-skip after the opening signature sweep begins
  setTimeout(() => {
    splash.addEventListener('click', finishSplash, { once: true });
  }, 850);

  const duration = 10000;
  const start = performance.now();

  const tick = (now) => {
    if (dismissed) return;
    const elapsed = now - start;
    const progress = Math.min(1, elapsed / duration);
    // Gentle ease so the bar advances smoothly over the full 10 seconds
    const eased = 1 - Math.pow(1 - progress, 3);
    const pct = Math.round(eased * 100);

    if (fillEl) fillEl.style.width = `${pct}%`;
    if (pctEl) pctEl.textContent = `${pct}%`;
    if (statusEl) {
      if (pct < 30) statusEl.textContent = 'Preparing salon services...';
      else if (pct < 70) statusEl.textContent = 'Syncing live chair availability...';
      else statusEl.textContent = 'Welcome to Nicole Beauty Parlour';
    }

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      setTimeout(finishSplash, 140);
    }
  };

  requestAnimationFrame(tick);
}

function init() {
  initViewportEngine();
  runAnimatedSplashScreen();
  bindEvents();
  store.subscribe(() => renderAll());
  renderAll();
  store.syncFromServer();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
}

init();

import {
  SALON_INFO,
  SIZE_OPTIONS,
  LENGTH_OPTIONS,
  OFFICIAL_PRICE_MATRIX,
  SPECIALTY_FLAT_PRICE,
  CATEGORIES,
  ADD_ONS,
  STYLISTS,
  TIME_SLOTS,
  calculateStylePrice
} from './data.js';
import { SalonStore } from './store.js';
import { compressImageFile, renderPromoFlyerBlob } from './flyer.js';

const store = new SalonStore();

// UI State
const ui = {
  activeTab: 'discover',
  // Calculator state
  calcMode: 'matrix',
  calcSize: 'medium',
  calcLength: 'midback',
  // Market filters
  searchQuery: '',
  selectedCategory: 'all',
  savedOnly: false,
  sortBy: 'featured',
  // Booking form state
  bookStyleId: 'style-01',
  bookSize: 'medium',
  bookLength: 'midback',
  bookStylistId: 'nicole',
  bookDate: getUpcomingDates(14)[1]?.iso || getUpcomingDates(14)[0].iso,
  bookTime: '09:00',
  bookAddOnIds: new Set(),
  appliedPromo: null,
  // Messaging state
  activeThreadId: 'thread-nicole',
  mobileConvOpen: true,
  senderMode: 'client',
  pendingChatAttachment: null,
  // Modals & transient state
  newStyleImage: '/images/style-01-honey-curly-knotless.jpg',
  newPromoImage: '/images/style-14-burgundy-french-curl.jpg',
  lastFlyerBlob: null,
  lastFlyerPromo: null,
  deferredInstallPrompt: null,
  storyIndex: 0,
  storyTimer: null,
  promoSlideIndex: 0
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
    el.style.transform = 'translateY(-8px)';
    el.style.transition = 'all 220ms ease';
    setTimeout(() => el.remove(), 230);
  }, 2900);
}

/* ================= MODAL HELPERS ================= */
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('hidden');
  if (id === 'storyModal' && ui.storyTimer) {
    clearTimeout(ui.storyTimer);
    ui.storyTimer = null;
  }
  const anyOpen = document.querySelector('.modal-overlay:not(.hidden)');
  if (!anyOpen) document.body.style.overflow = '';
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach((m) => m.classList.add('hidden'));
  if (ui.storyTimer) {
    clearTimeout(ui.storyTimer);
    ui.storyTimer = null;
  }
  document.body.style.overflow = '';
}

/* ================= ANIMATED SPLASH SCREEN ================= */
function runSplashSequence(fast = false) {
  const splash = document.getElementById('splashScreen');
  const fill = document.getElementById('splashProgressFill');
  const pct = document.getElementById('splashPercent');
  const status = document.getElementById('splashStatusText');
  if (!splash || !fill || !pct || !status) return;

  splash.classList.remove('exit');
  const steps = [
    { p: 24, text: 'Sectioning crisp knotless parts...' },
    { p: 54, text: 'Prepping luxury braids & French curls...' },
    { p: 82, text: 'Syncing BWP rates & salon schedule...' },
    { p: 100, text: 'Look Good 💙 Feel Good 💙 Be You ✨' }
  ];

  let idx = 0;
  fill.style.width = '8%';
  pct.textContent = '8%';

  const stepMs = fast ? 260 : 480;
  const interval = setInterval(() => {
    if (idx >= steps.length) {
      clearInterval(interval);
      setTimeout(() => splash.classList.add('exit'), 260);
      return;
    }
    const cur = steps[idx++];
    fill.style.width = `${cur.p}%`;
    pct.textContent = `${cur.p}%`;
    status.textContent = cur.text;
  }, stepMs);

  document.getElementById('skipSplashBtn')?.addEventListener(
    'click',
    () => {
      clearInterval(interval);
      splash.classList.add('exit');
    },
    { once: true }
  );
}

/* ================= NAVIGATION ================= */
function switchTab(tabId) {
  ui.activeTab = tabId;
  document.querySelectorAll('.app-view').forEach((view) => {
    view.classList.toggle('active', view.id === `view-${tabId}`);
  });
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  if (tabId === 'messages') {
    store.markThreadRead(ui.activeThreadId);
    scrollMessagesBottom();
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ================= STORIES ================= */
function getStoriesData() {
  return [
    {
      label: 'Price Menu',
      img: '/images/price-menu-card.jpg',
      price: 'P130 – P500',
      caption: 'Official @NICOLE_BEAUTY_PARLOUR BWP Price List — Jumbo from P130 & Softdread flat P250!',
      styleId: 'style-01'
    },
    {
      label: 'Honey Curls',
      img: '/images/style-01-honey-curly-knotless.jpg',
      price: 'From P180',
      caption: 'Signature Honey Blonde (#27/#30) Knotless with bouncy spiral curly ends 💙',
      styleId: 'style-01'
    },
    {
      label: 'French Curl',
      img: '/images/style-14-burgundy-french-curl.jpg',
      price: 'From P250',
      caption: 'Burgundy Wine Ombre French Curl Knotless — ultra-glossy & lightweight!',
      styleId: 'style-14'
    },
    {
      label: 'Softdread',
      img: '/images/style-13-passion-curly-twists.jpg',
      price: 'Flat P250',
      caption: "Pick n' Drop, Switch & Passion Softdread Twists — official flat P250 deal!",
      styleId: 'style-13'
    },
    {
      label: 'High Pony',
      img: '/images/style-05-caramel-high-pony.jpg',
      price: 'From P180',
      caption: 'Pain-free sleek Caramel #30 High-Ponytail Knotless with crisp geometric parts.',
      styleId: 'style-05'
    },
    {
      label: 'Glam Updo',
      img: '/images/style-06-golden-velvet-updo.jpg',
      price: 'From P180',
      caption: 'Golden #27 Velvet Scrunchie Crown Updo — ready for birthdays & graduations 👑',
      styleId: 'style-06'
    },
    {
      label: 'Boho Knee',
      img: '/images/style-11-goddess-boho-knee.jpg',
      price: 'P400 Knee',
      caption: 'Show-stopping S-Medium Knee-Length Goddess Boho Knotless with lush curls.',
      styleId: 'style-11'
    }
  ];
}

function renderStories() {
  const container = document.getElementById('storiesStrip');
  if (!container) return;
  const stories = getStoriesData();
  container.innerHTML = stories
    .map(
      (s, idx) => `
      <button type="button" class="story-bubble" data-story-idx="${idx}">
        <div class="story-ring">
          <img src="${esc(s.img)}" alt="${esc(s.label)}" loading="lazy" />
        </div>
        <span>${esc(s.label)}</span>
      </button>
    `
    )
    .join('');

  container.querySelectorAll('.story-bubble').forEach((btn) => {
    btn.addEventListener('click', () => {
      openStoryAt(Number(btn.dataset.storyIdx));
    });
  });
}

function openStoryAt(index) {
  const stories = getStoriesData();
  if (!stories.length) return;
  ui.storyIndex = ((index % stories.length) + stories.length) % stories.length;
  const cur = stories[ui.storyIndex];

  const bars = document.getElementById('storyProgressBars');
  bars.innerHTML = stories
    .map(
      (_, i) =>
        `<div class="story-seg ${i < ui.storyIndex ? 'done' : i === ui.storyIndex ? 'current' : ''}"></div>`
    )
    .join('');

  document.getElementById('storyMainImg').src = cur.img;
  document.getElementById('storyPriceBadge').textContent = cur.price;
  document.getElementById('storyCaptionText').textContent = cur.caption;

  const bookBtn = document.getElementById('storyBookBtn');
  bookBtn.onclick = () => {
    closeModal('storyModal');
    startBookingForStyle(cur.styleId);
  };

  openModal('storyModal');

  if (ui.storyTimer) clearTimeout(ui.storyTimer);
  ui.storyTimer = setTimeout(() => {
    if (ui.storyIndex < stories.length - 1) openStoryAt(ui.storyIndex + 1);
    else closeModal('storyModal');
  }, 4500);
}

/* ================= PROMO / ADVERT CAROUSEL ================= */
function renderPromoCarousel() {
  const wrap = document.getElementById('promoCarousel');
  const dots = document.getElementById('promoDots');
  if (!wrap || !dots) return;

  const activePromos = store.state.promotions.filter((p) => p.active);
  const list = activePromos.length ? activePromos : store.state.promotions.slice(0, 1);

  wrap.innerHTML = list
    .map(
      (p) => `
      <article class="promo-slide ${esc(p.theme || 'royal-sky')}">
        <div class="promo-slide-copy">
          <div class="promo-top-tags">
            <span class="promo-pill-gold">${esc(p.badge || `${p.discountPercent}% OFF`)}</span>
            <span class="promo-pill-code">CODE: ${esc(p.code)}</span>
          </div>
          <div>
            <h2>${esc(p.title)}</h2>
            <p>${esc(p.subtitle)}</p>
          </div>
          <div class="promo-actions-row">
            <button type="button" class="promo-book-btn" data-apply-promo="${esc(p.id)}">
              Claim ${p.discountPercent}% Off &amp; Book ›
            </button>
            <button type="button" class="promo-flyer-btn" data-open-flyer="${esc(p.id)}">
              🎨 Flyer
            </button>
          </div>
        </div>
        <div class="promo-slide-media">
          <img src="${esc(p.image)}" alt="${esc(p.title)}" />
          <span class="promo-price-float">${esc(p.priceHighlight || `${p.discountPercent}% OFF`)}</span>
        </div>
      </article>
    `
    )
    .join('');

  dots.innerHTML = list
    .map(
      (_, idx) =>
        `<button type="button" class="promo-dot ${idx === 0 ? 'active' : ''}" data-dot="${idx}" aria-label="Slide ${idx + 1}"></button>`
    )
    .join('');

  wrap.querySelectorAll('[data-apply-promo]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const promo = store.state.promotions.find((p) => p.id === btn.dataset.applyPromo);
      if (!promo) return;
      ui.appliedPromo = promo;
      if (promo.styleId) ui.bookStyleId = promo.styleId;
      const input = document.getElementById('bookPromoInput');
      if (input) input.value = promo.code;
      renderBookingWizard();
      switchTab('book');
      showToast(`Promo code ${promo.code} (${promo.discountPercent}% OFF) applied! 🎉`);
    });
  });

  wrap.querySelectorAll('[data-open-flyer]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const promo = store.state.promotions.find((p) => p.id === btn.dataset.openFlyer);
      if (promo) openFlyerGeneratorModal(promo);
    });
  });

  dots.querySelectorAll('.promo-dot').forEach((dot) => {
    dot.addEventListener('click', () => {
      const idx = Number(dot.dataset.dot);
      const slideWidth = wrap.clientWidth;
      wrap.scrollTo({ left: slideWidth * idx, behavior: 'smooth' });
      dots.querySelectorAll('.promo-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
    });
  });
}

/* ================= PRICE CALCULATOR ================= */
function renderCalculator() {
  const sizeWrap = document.getElementById('calcSizePills');
  const lenWrap = document.getElementById('calcLengthPills');
  const matrixWrap = document.getElementById('calcMatrixControls');
  const priceDisplay = document.getElementById('calcPriceDisplay');
  const metaDisplay = document.getElementById('calcMetaDisplay');
  if (!sizeWrap || !lenWrap) return;

  document.querySelectorAll('#calcTypeToggle .seg-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === ui.calcMode);
  });

  matrixWrap.classList.toggle('hidden', ui.calcMode === 'flat');

  sizeWrap.innerHTML = SIZE_OPTIONS.map(
    (s) => `
    <button type="button" class="choice-pill ${ui.calcSize === s.id ? 'active' : ''}" data-size="${s.id}">
      ${esc(s.short)}
    </button>
  `
  ).join('');

  lenWrap.innerHTML = LENGTH_OPTIONS.map(
    (l) => `
    <button type="button" class="choice-pill ${ui.calcLength === l.id ? 'active' : ''}" data-len="${l.id}">
      ${esc(l.label)}
    </button>
  `
  ).join('');

  sizeWrap.querySelectorAll('.choice-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.calcSize = btn.dataset.size;
      renderCalculator();
    });
  });

  lenWrap.querySelectorAll('.choice-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.calcLength = btn.dataset.len;
      renderCalculator();
    });
  });

  if (ui.calcMode === 'flat') {
    priceDisplay.textContent = formatPula(SPECIALTY_FLAT_PRICE);
    metaDisplay.textContent = "Pick n' Drop / Switch / Softdread • 3.5–4.5 hrs";
  } else {
    const price = OFFICIAL_PRICE_MATRIX[ui.calcSize]?.[ui.calcLength] ?? 180;
    const sizeInfo = SIZE_OPTIONS.find((s) => s.id === ui.calcSize) || SIZE_OPTIONS[2];
    priceDisplay.textContent = formatPula(price);
    metaDisplay.textContent = `${sizeInfo.durationHrs} • ${sizeInfo.packs}`;
  }
}

/* ================= HAIRSTYLE CARDS & MARKETPLACE ================= */
function buildStyleCardHtml(style) {
  const price = calculateStylePrice(style, style.defaultSize, style.defaultLength);
  const sizeObj = SIZE_OPTIONS.find((s) => s.id === style.defaultSize);
  const lenObj = LENGTH_OPTIONS.find((l) => l.id === style.defaultLength);
  const rateLabel =
    style.pricingMode === 'flat'
      ? 'Official Flat Rate'
      : `${sizeObj?.short || 'Med'} • ${lenObj?.label || 'Midback'}`;

  return `
    <article class="style-card" data-style-id="${esc(style.id)}">
      <div class="style-img-box">
        <img src="${esc(style.image)}" alt="${esc(style.name)}" loading="lazy" />
        <div class="style-card-top-badges">
          <span class="style-badge-tag">${esc(style.badge || style.category)}</span>
          <button
            type="button"
            class="heart-btn ${style.saved ? 'saved' : ''}"
            data-save-id="${esc(style.id)}"
            aria-label="Save hairstyle"
          >
            ♥
          </button>
        </div>
      </div>
      <div class="style-card-body">
        <div class="style-cat-row">
          <span>${esc(style.category)}</span>
          <span class="style-rating">★ ${Number(style.rating || 5).toFixed(1)}</span>
        </div>
        <h3>${esc(style.name)}</h3>
        <p class="style-meta-line">⏱ ${esc(style.duration || '4 hrs')} • ${esc(style.packs || '5 packs')}</p>
        <div class="style-card-footer">
          <div class="style-price-block">
            <small>${esc(rateLabel)}</small>
            <strong>${formatPula(price)}</strong>
          </div>
          <span class="card-book-mini">Options ›</span>
        </div>
      </div>
    </article>
  `;
}

function wireStyleCards(container) {
  if (!container) return;
  container.querySelectorAll('.style-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      const saveBtn = e.target.closest('[data-save-id]');
      if (saveBtn) {
        e.stopPropagation();
        const saved = store.toggleSaveStyle(saveBtn.dataset.saveId);
        showToast(saved ? 'Saved to your wishlist ♥' : 'Removed from wishlist');
        return;
      }
      openStyleDetailModal(card.dataset.styleId);
    });
  });
}

function renderFeaturedAndStylists() {
  const featuredGrid = document.getElementById('featuredStylesGrid');
  if (featuredGrid) {
    const featured = store.state.styles.filter((s) => s.featured).slice(0, 8);
    featuredGrid.innerHTML = featured.map(buildStyleCardHtml).join('');
    wireStyleCards(featuredGrid);
  }

  const stylistsRow = document.getElementById('stylistsRow');
  if (stylistsRow) {
    stylistsRow.innerHTML = STYLISTS.slice(0, 3)
      .map(
        (st) => `
        <div class="stylist-card">
          <img src="${esc(st.avatar)}" alt="${esc(st.name)}" loading="lazy" />
          <div>
            <strong>${esc(st.name)} • ★ ${st.rating.toFixed(1)}</strong>
            <span>${esc(st.role)}</span>
            <small>${esc(st.specialty)}</small>
          </div>
        </div>
      `
      )
      .join('');
  }
}

function renderMarketplace() {
  const chipsWrap = document.getElementById('marketCategoryChips');
  const grid = document.getElementById('marketStylesGrid');
  const countLabel = document.getElementById('marketCountLabel');
  const savedBtn = document.getElementById('savedOnlyToggle');
  if (!chipsWrap || !grid) return;

  chipsWrap.innerHTML = CATEGORIES.map(
    (c) => `
      <button
        type="button"
        class="cat-chip ${ui.selectedCategory === c.id ? 'active' : ''}"
        data-cat="${esc(c.id)}"
      >
        ${c.icon} ${esc(c.label)}
      </button>
    `
  ).join('');

  chipsWrap.querySelectorAll('.cat-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.selectedCategory = btn.dataset.cat;
      renderMarketplace();
    });
  });

  savedBtn?.classList.toggle('active', ui.savedOnly);

  const q = ui.searchQuery.trim().toLowerCase();
  let items = store.state.styles.filter((item) => {
    if (ui.selectedCategory !== 'all' && item.category !== ui.selectedCategory) return false;
    if (ui.savedOnly && !item.saved) return false;
    if (!q) return true;
    const hay = `${item.name} ${item.category} ${item.description} ${(item.tags || []).join(' ')}`.toLowerCase();
    return hay.includes(q);
  });

  items.sort((a, b) => {
    const pa = calculateStylePrice(a, a.defaultSize, a.defaultLength);
    const pb = calculateStylePrice(b, b.defaultSize, b.defaultLength);
    if (ui.sortBy === 'price-asc') return pa - pb;
    if (ui.sortBy === 'price-desc') return pb - pa;
    if (ui.sortBy === 'rating') return (b.rating || 5) - (a.rating || 5);
    return Number(Boolean(b.featured)) - Number(Boolean(a.featured));
  });

  if (countLabel) countLabel.textContent = `${items.length} hairstyle${items.length === 1 ? '' : 's'}`;

  if (!items.length) {
    grid.innerHTML = `
      <div class="glass-card" style="grid-column: 1 / -1; text-align:center; padding: 32px;">
        <h3>No matching hairstyles found</h3>
        <p class="muted-sub">Try clearing your search filter or upload a custom hairstyle!</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = items.map(buildStyleCardHtml).join('');
  wireStyleCards(grid);
}

/* ================= STYLE DETAIL MODAL ================= */
function openStyleDetailModal(styleId) {
  const style = store.state.styles.find((s) => s.id === styleId);
  if (!style) return;

  let selSize = style.defaultSize || 'medium';
  let selLength = style.defaultLength || 'midback';

  const body = document.getElementById('styleDetailBody');
  const renderModalInner = () => {
    const livePrice = calculateStylePrice(style, selSize, selLength);
    const sizeInfo = SIZE_OPTIONS.find((s) => s.id === selSize) || SIZE_OPTIONS[2];

    body.innerHTML = `
      <img src="${esc(style.image)}" alt="${esc(style.name)}" class="detail-hero-img" />
      <div class="modal-pad">
        <div class="card-head" style="margin-bottom:8px;">
          <div>
            <span class="eyebrow-chip">${esc(style.category)} • ★ ${Number(style.rating || 5).toFixed(1)} (${style.reviewsCount || 24} reviews)</span>
            <h2>${esc(style.name)}</h2>
          </div>
          <strong style="font-size:1.65rem; color:var(--sky-deep);">${formatPula(livePrice)}</strong>
        </div>

        <p class="muted-sub">${esc(style.description)}</p>

        <div class="detail-tags-row">
          <span>⏱ ${esc(style.duration || sizeInfo.durationHrs)}</span>
          <span>🛍️ ${esc(style.packs || sizeInfo.packs)}</span>
          ${(style.tags || []).map((t) => `<span>${esc(t)}</span>`).join('')}
        </div>

        ${
          style.pricingMode === 'flat'
            ? `<div class="notif-card" style="margin:12px 0;">
                <strong>Official Flat-Rate Salon Special (${formatPula(livePrice)})</strong>
                <p>Includes tension-free knotless parting &amp; mousse sheen finish (+P50 for Knee Length).</p>
               </div>`
            : `
              <div class="calc-controls-wrap" style="margin-top:14px;">
                <div class="calc-group">
                  <label>Choose Braid Size</label>
                  <div class="pill-selector">
                    ${SIZE_OPTIONS.map(
                      (s) => `
                      <button type="button" class="choice-pill ${selSize === s.id ? 'active' : ''}" data-msize="${s.id}">
                        ${esc(s.short)}
                      </button>`
                    ).join('')}
                  </div>
                </div>
                <div class="calc-group">
                  <label>Choose Braid Length</label>
                  <div class="pill-selector three-col">
                    ${LENGTH_OPTIONS.map(
                      (l) => `
                      <button type="button" class="choice-pill ${selLength === l.id ? 'active' : ''}" data-mlen="${l.id}">
                        ${esc(l.label)}
                      </button>`
                    ).join('')}
                  </div>
                </div>
              </div>
            `
        }

        <div class="modal-btn-pair">
          <button type="button" class="secondary-btn" id="modalAskChatBtn">
            💬 Ask Nicole in Chat
          </button>
          <button type="button" class="primary-cta" id="modalBookStyleBtn">
            📅 Book for ${formatPula(livePrice)} ›
          </button>
        </div>
      </div>
    `;

    body.querySelectorAll('[data-msize]').forEach((b) => {
      b.addEventListener('click', () => {
        selSize = b.dataset.msize;
        renderModalInner();
      });
    });

    body.querySelectorAll('[data-mlen]').forEach((b) => {
      b.addEventListener('click', () => {
        selLength = b.dataset.mlen;
        renderModalInner();
      });
    });

    body.querySelector('#modalBookStyleBtn')?.addEventListener('click', () => {
      closeModal('styleDetailModal');
      startBookingForStyle(style.id, selSize, selLength);
    });

    body.querySelector('#modalAskChatBtn')?.addEventListener('click', () => {
      closeModal('styleDetailModal');
      sendStyleInquiryToChat(style, selSize, selLength, livePrice);
    });
  };

  renderModalInner();
  openModal('styleDetailModal');
}

/* ================= OFFICIAL PRICE SHEET MODAL ================= */
function renderPriceSheetModal() {
  const wrap = document.getElementById('interactivePriceTableWrap');
  if (!wrap) return;

  wrap.innerHTML = `
    <table class="price-matrix-table">
      <thead>
        <tr>
          <th>Braid / Twist Size</th>
          <th>Midback</th>
          <th>Butt Length</th>
          <th>Knee Length</th>
        </tr>
      </thead>
      <tbody>
        ${SIZE_OPTIONS.map((s) => {
          const row = OFFICIAL_PRICE_MATRIX[s.id];
          return `
            <tr>
              <td>${esc(s.label)}</td>
              <td><button type="button" class="price-cell-btn" data-psize="${s.id}" data-plen="midback">P${row.midback}</button></td>
              <td><button type="button" class="price-cell-btn" data-psize="${s.id}" data-plen="butt">P${row.butt}</button></td>
              <td><button type="button" class="price-cell-btn" data-psize="${s.id}" data-plen="knee">P${row.knee}</button></td>
            </tr>
          `;
        }).join('')}
        <tr>
          <td>Pick n' Drop / Switch / Softdread</td>
          <td colspan="3">
            <button type="button" class="price-cell-btn" data-pflat="style-13" style="width:100%;">
              Flat P250 — Tap to Book
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  `;

  wrap.querySelectorAll('[data-psize]').forEach((btn) => {
    btn.addEventListener('click', () => {
      closeModal('priceSheetModal');
      startBookingForStyle('style-01', btn.dataset.psize, btn.dataset.plen);
    });
  });

  wrap.querySelector('[data-pflat]')?.addEventListener('click', () => {
    closeModal('priceSheetModal');
    startBookingForStyle('style-13', 'medium', 'midback');
  });
}

/* ================= BOOKING WIZARD & DIGITAL PASS ================= */
function startBookingForStyle(styleId, sizeId, lengthId) {
  const style = store.state.styles.find((s) => s.id === styleId) || store.state.styles[0];
  if (style) {
    ui.bookStyleId = style.id;
    ui.bookSize = sizeId || style.defaultSize || 'medium';
    ui.bookLength = lengthId || style.defaultLength || 'midback';
  }
  renderBookingWizard();
  switchTab('book');
}

function getBookingTotals() {
  const style = store.state.styles.find((s) => s.id === ui.bookStyleId) || store.state.styles[0];
  const basePrice = calculateStylePrice(style, ui.bookSize, ui.bookLength);
  let addOnsTotal = 0;
  const selectedAddOns = [];
  for (const addon of ADD_ONS) {
    if (ui.bookAddOnIds.has(addon.id)) {
      addOnsTotal += addon.price;
      selectedAddOns.push(addon);
    }
  }
  const subtotal = basePrice + addOnsTotal;
  const discount = ui.appliedPromo
    ? Math.round((subtotal * Number(ui.appliedPromo.discountPercent || 0)) / 100)
    : 0;
  const total = Math.max(50, subtotal - discount);
  const deposit = Math.round((total * SALON_INFO.depositPercent) / 100);
  return { style, basePrice, selectedAddOns, subtotal, discount, total, deposit };
}

function renderBookingWizard() {
  const preview = document.getElementById('bookingSelectedPreview');
  const strip = document.getElementById('bookingStyleStrip');
  const sizeSel = document.getElementById('bookSizeSelect');
  const lenSel = document.getElementById('bookLengthSelect');
  const stylistWrap = document.getElementById('bookStylistCards');
  const dateRibbon = document.getElementById('bookDateRibbon');
  const dateInput = document.getElementById('bookDateInput');
  const slotsWrap = document.getElementById('bookTimeSlots');
  const addOnsWrap = document.getElementById('bookAddOnsList');
  const promoChips = document.getElementById('activePromoChips');
  if (!preview || !strip) return;

  const { style, basePrice, subtotal, discount, total, deposit } = getBookingTotals();

  preview.innerHTML = `
    <img src="${esc(style.image)}" alt="${esc(style.name)}" />
    <div>
      <strong>${esc(style.name)}</strong>
      <span>${esc(style.category)} • Base rate: ${formatPula(basePrice)} (${esc(style.duration || '4 hrs')})</span>
    </div>
  `;

  strip.innerHTML = store.state.styles
    .map(
      (s) => `
      <button
        type="button"
        class="mini-style-thumb ${s.id === style.id ? 'active' : ''}"
        data-bstyle="${esc(s.id)}"
        title="${esc(s.name)}"
      >
        <img src="${esc(s.image)}" alt="${esc(s.name)}" loading="lazy" />
      </button>
    `
    )
    .join('');

  strip.querySelectorAll('.mini-style-thumb').forEach((b) => {
    b.addEventListener('click', () => {
      const picked = store.state.styles.find((s) => s.id === b.dataset.bstyle);
      if (!picked) return;
      ui.bookStyleId = picked.id;
      ui.bookSize = picked.defaultSize || ui.bookSize;
      ui.bookLength = picked.defaultLength || ui.bookLength;
      renderBookingWizard();
    });
  });

  sizeSel.innerHTML = SIZE_OPTIONS.map(
    (s) => `<option value="${s.id}" ${ui.bookSize === s.id ? 'selected' : ''}>${esc(s.label)} (${s.durationHrs})</option>`
  ).join('');
  sizeSel.disabled = style.pricingMode === 'flat';

  lenSel.innerHTML = LENGTH_OPTIONS.map(
    (l) => `<option value="${l.id}" ${ui.bookLength === l.id ? 'selected' : ''}>${esc(l.label)}</option>`
  ).join('');

  stylistWrap.innerHTML = STYLISTS.map(
    (st) => `
      <button
        type="button"
        class="stylist-pick-btn ${ui.bookStylistId === st.id ? 'active' : ''}"
        data-bstylist="${st.id}"
      >
        <img src="${esc(st.avatar)}" alt="${esc(st.name)}" />
        <div>
          <strong>${esc(st.name)}</strong>
          <small>${esc(st.badge)} • ★ ${st.rating.toFixed(1)}</small>
        </div>
      </button>
    `
  ).join('');

  stylistWrap.querySelectorAll('.stylist-pick-btn').forEach((b) => {
    b.addEventListener('click', () => {
      ui.bookStylistId = b.dataset.bstylist;
      renderBookingWizard();
    });
  });

  const dates = getUpcomingDates(14);
  if (dateInput) dateInput.value = ui.bookDate;
  dateRibbon.innerHTML = dates
    .map(
      (d) => `
      <button type="button" class="date-pill ${ui.bookDate === d.iso ? 'active' : ''}" data-bdate="${d.iso}">
        <span>${d.dayName}</span>
        <strong>${d.dayNum}</strong>
        <span>${d.month}</span>
      </button>
    `
    )
    .join('');

  dateRibbon.querySelectorAll('.date-pill').forEach((b) => {
    b.addEventListener('click', () => {
      ui.bookDate = b.dataset.bdate;
      renderBookingWizard();
    });
  });

  slotsWrap.innerHTML = TIME_SLOTS.map(
    (slot) => `
      <button type="button" class="time-slot-btn ${ui.bookTime === slot ? 'active' : ''}" data-btime="${slot}">
        ${slot}
      </button>
    `
  ).join('');

  slotsWrap.querySelectorAll('.time-slot-btn').forEach((b) => {
    b.addEventListener('click', () => {
      ui.bookTime = b.dataset.btime;
      renderBookingWizard();
    });
  });

  addOnsWrap.innerHTML = ADD_ONS.map(
    (addon) => `
      <button
        type="button"
        class="addon-toggle ${ui.bookAddOnIds.has(addon.id) ? 'active' : ''}"
        data-baddon="${addon.id}"
      >
        <span>${addon.icon} ${esc(addon.name)}</span>
        <strong>+${formatPula(addon.price)}</strong>
      </button>
    `
  ).join('');

  addOnsWrap.querySelectorAll('.addon-toggle').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.dataset.baddon;
      if (ui.bookAddOnIds.has(id)) ui.bookAddOnIds.delete(id);
      else ui.bookAddOnIds.add(id);
      renderBookingWizard();
    });
  });

  promoChips.innerHTML = store.state.promotions
    .filter((p) => p.active)
    .map(
      (p) => `
      <button type="button" class="mini-promo-chip" data-chip-code="${esc(p.code)}">
        🏷️ ${esc(p.code)} (-${p.discountPercent}%)
      </button>
    `
    )
    .join('');

  promoChips.querySelectorAll('.mini-promo-chip').forEach((b) => {
    b.addEventListener('click', () => {
      const code = b.dataset.chipCode;
      document.getElementById('bookPromoInput').value = code;
      applyPromoCodeByText(code);
    });
  });

  document.getElementById('sumSubtotal').textContent = formatPula(subtotal);
  const discRow = document.getElementById('sumDiscountRow');
  if (ui.appliedPromo && discount > 0) {
    discRow.classList.remove('hidden');
    document.getElementById('sumDiscountLabel').textContent = `Promo (${ui.appliedPromo.code} • -${ui.appliedPromo.discountPercent}%)`;
    document.getElementById('sumDiscountVal').textContent = `-${formatPula(discount)}`;
  } else {
    discRow.classList.add('hidden');
  }
  document.getElementById('sumTotal').textContent = formatPula(total);
  document.getElementById('sumDepositNote').textContent = `30% seat deposit: ${formatPula(deposit)} (Orange Money / MyZaka: ${SALON_INFO.phoneRaw})`;
}

function applyPromoCodeByText(rawCode) {
  const code = String(rawCode || '').trim().toUpperCase();
  const feedback = document.getElementById('promoFeedback');
  if (!code) {
    ui.appliedPromo = null;
    if (feedback) feedback.textContent = '';
    renderBookingWizard();
    return;
  }
  const found = store.state.promotions.find((p) => p.active && p.code.toUpperCase() === code);
  if (!found) {
    ui.appliedPromo = null;
    if (feedback) {
      feedback.style.color = '#dc2626';
      feedback.textContent = `Code "${code}" not found or inactive.`;
    }
    renderBookingWizard();
    return;
  }
  ui.appliedPromo = found;
  if (feedback) {
    feedback.style.color = '#059669';
    feedback.textContent = `✓ ${found.code} applied — ${found.discountPercent}% OFF unlocked!`;
  }
  renderBookingWizard();
}

function renderMyBookings() {
  const list = document.getElementById('myBookingsList');
  const badge = document.getElementById('bookingsCountBadge');
  if (!list) return;

  const bookings = store.state.bookings;
  if (badge) badge.textContent = String(bookings.length);

  if (!bookings.length) {
    list.innerHTML = `<p class="muted-sub">No appointments yet — reserve your first chair on the left!</p>`;
    return;
  }

  list.innerHTML = bookings
    .map((bk) => {
      const waMsg = encodeURIComponent(
        `Hi Nicole Beauty Parlour! 👑 Confirming my booking ${bk.id}:\n• Style: ${bk.styleName} (${bk.sizeLabel}, ${bk.lengthLabel})\n• Date: ${bk.date} at ${bk.time}\n• Total: P${bk.total} (Deposit P${bk.deposit})`
      );
      return `
        <div class="booking-item-card">
          <div class="bk-head">
            <img src="${esc(bk.styleImage)}" alt="${esc(bk.styleName)}" />
            <div>
              <strong>${esc(bk.styleName)}</strong>
              <small>${esc(bk.date)} • ${esc(bk.time)} • ${formatPula(bk.total)}</small>
            </div>
            <span class="bk-status-pill ${bk.status === 'Cancelled' ? 'cancelled' : ''}">
              ${esc(bk.status)}
            </span>
          </div>
          <div class="bk-actions">
            <button type="button" data-open-pass="${esc(bk.id)}">🎟️ View Pass</button>
            <button type="button" data-chat-bk="${esc(bk.id)}">💬 Message</button>
            <a href="https://wa.me/${SALON_INFO.phoneIntl}?text=${waMsg}" target="_blank" rel="noopener noreferrer">
              📲 WhatsApp
            </a>
            ${
              bk.status !== 'Cancelled'
                ? `<button type="button" data-cancel-bk="${esc(bk.id)}">Cancel</button>`
                : ''
            }
          </div>
        </div>
      `;
    })
    .join('');

  list.querySelectorAll('[data-open-pass]').forEach((b) => {
    b.addEventListener('click', () => {
      const bk = store.state.bookings.find((x) => x.id === b.dataset.openPass);
      if (bk) openBookingPassModal(bk);
    });
  });

  list.querySelectorAll('[data-chat-bk]').forEach((b) => {
    b.addEventListener('click', () => {
      ui.activeThreadId = 'thread-nicole';
      ui.mobileConvOpen = true;
      switchTab('messages');
    });
  });

  list.querySelectorAll('[data-cancel-bk]').forEach((b) => {
    b.addEventListener('click', async () => {
      await store.updateBookingStatus(b.dataset.cancelBk, { status: 'Cancelled' });
      showToast('Appointment cancelled');
    });
  });
}

function openBookingPassModal(bk) {
  const body = document.getElementById('bookingPassBody');
  if (!body) return;

  const waMsg = encodeURIComponent(
    `Dumelang Nicole Beauty Parlour! 💙 Here is my Digital Appointment Pass (${bk.id}):\n• Client: ${bk.clientName} (${bk.clientPhone})\n• Style: ${bk.styleName} (${bk.sizeLabel} • ${bk.lengthLabel})\n• Stylist: ${bk.stylistName}\n• Date & Time: ${bk.date} at ${bk.time}\n• Total: P${bk.total} (30% Deposit: P${bk.deposit} via ${bk.paymentMethod})`
  );

  body.innerHTML = `
    <div class="digital-pass-card">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span class="pass-ref-badge">REF: ${esc(bk.id)}</span>
        <span style="font-size:0.78rem; color:#86efac; font-weight:800;">✓ ${esc(bk.status)}</span>
      </div>

      <div style="display:flex; gap:12px; align-items:center;">
        <img src="${esc(bk.styleImage)}" alt="${esc(bk.styleName)}" style="width:68px; height:68px; border-radius:16px; object-fit:cover;" />
        <div>
          <strong style="font-size:1.08rem; display:block;">${esc(bk.styleName)}</strong>
          <span style="font-size:0.8rem; color:#bae6fd;">${esc(bk.sizeLabel)} • ${esc(bk.lengthLabel)}</span>
        </div>
      </div>

      <div class="pass-grid">
        <div><small>Client</small><strong>${esc(bk.clientName)}</strong></div>
        <div><small>Stylist</small><strong>${esc(bk.stylistName)} 👑</strong></div>
        <div><small>Date &amp; Time</small><strong>${esc(bk.date)} • ${esc(bk.time)}</strong></div>
        <div><small>Total / Deposit</small><strong>${formatPula(bk.total)} (Dep ${formatPula(bk.deposit)})</strong></div>
      </div>

      <p style="font-size:0.76rem; color:#e0f2fe;">
        💳 Deposit line: <b>${esc(bk.paymentMethod)}</b> • Salon WhatsApp: <b>${SALON_INFO.phoneDisplay}</b>
      </p>
    </div>

    <div class="modal-btn-pair">
      <button type="button" class="secondary-btn" id="passDownloadIcsBtn">📅 Save to Calendar</button>
      <a
        href="https://wa.me/${SALON_INFO.phoneIntl}?text=${waMsg}"
        target="_blank"
        rel="noopener noreferrer"
        class="primary-cta"
      >
        📲 Send on WhatsApp
      </a>
    </div>
  `;

  body.querySelector('#passDownloadIcsBtn')?.addEventListener('click', () => {
    const dt = bk.date.replace(/-/g, '') + 'T' + bk.time.replace(':', '') + '00';
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `SUMMARY:Nicole Beauty Parlour - ${bk.styleName} (${bk.id})`,
      `DTSTART:${dt}`,
      `DESCRIPTION:Style: ${bk.styleName} (${bk.sizeLabel}, ${bk.lengthLabel}) | Total: P${bk.total} | Phone: ${SALON_INFO.phoneDisplay}`,
      `LOCATION:${SALON_INFO.location}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${bk.id}-nicole-beauty-parlour.ics`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Calendar invite downloaded 📅');
  });

  openModal('bookingPassModal');
}

/* ================= REAL-TIME TWO-WAY SALON MESSAGING ================= */
function renderMessaging() {
  const workspace = document.querySelector('.chat-workspace');
  const threadsList = document.getElementById('threadsList');
  const feed = document.getElementById('messagesFeed');
  const navBadge = document.getElementById('navUnreadBadge');
  if (!threadsList || !feed || !workspace) return;

  workspace.classList.toggle('conv-open', ui.mobileConvOpen);

  const totalUnread = store.state.threads.reduce((sum, t) => sum + Number(t.unread || 0), 0);
  if (navBadge) {
    navBadge.textContent = String(totalUnread);
    navBadge.classList.toggle('hidden', totalUnread === 0);
  }

  threadsList.innerHTML = store.state.threads
    .map((t) => {
      const lastMsg = t.messages[t.messages.length - 1];
      return `
        <button
          type="button"
          class="thread-row ${t.id === ui.activeThreadId ? 'active' : ''}"
          data-thread-id="${esc(t.id)}"
        >
          <img src="${esc(t.avatar)}" alt="${esc(t.title)}" />
          <div class="thread-row-copy">
            <strong>${esc(t.title)}</strong>
            <small>${esc(lastMsg?.text || t.subtitle)}</small>
          </div>
          ${t.unread ? `<span class="thread-unread-pill">${t.unread}</span>` : ''}
        </button>
      `;
    })
    .join('');

  threadsList.querySelectorAll('.thread-row').forEach((row) => {
    row.addEventListener('click', () => {
      ui.activeThreadId = row.dataset.threadId;
      ui.mobileConvOpen = true;
      store.markThreadRead(ui.activeThreadId);
      renderMessaging();
      scrollMessagesBottom();
    });
  });

  const activeThread =
    store.state.threads.find((t) => t.id === ui.activeThreadId) || store.state.threads[0];
  if (!activeThread) return;

  document.getElementById('activeThreadAvatar').src = activeThread.avatar;
  document.getElementById('activeThreadTitle').textContent = activeThread.title;
  document.getElementById('activeThreadSub').textContent = activeThread.subtitle;

  document.querySelectorAll('.sender-mode-switch .mode-chip').forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.sender === ui.senderMode);
  });

  const input = document.getElementById('chatMessageInput');
  if (input) {
    input.placeholder =
      ui.senderMode === 'salon'
        ? 'Reply as Nicole (Salon Owner)... 👑'
        : 'Write a message to Nicole Beauty Parlour...';
  }

  feed.innerHTML = activeThread.messages
    .map(
      (m) => `
      <div class="msg-bubble ${m.sender === 'salon' ? 'salon' : 'client'}">
        <span class="msg-sender-tag">${esc(m.senderName || (m.sender === 'salon' ? 'Nicole' : 'You'))}</span>
        ${m.badge ? `<span class="msg-badge-chip">${esc(m.badge)}</span>` : ''}
        ${m.image ? `<img src="${esc(m.image)}" alt="Shared hairstyle" class="msg-media-img" />` : ''}
        <div>${esc(m.text)}</div>
        <span class="msg-time">${esc(m.timestamp || 'Now')}</span>
      </div>
    `
    )
    .join('');
}

function scrollMessagesBottom() {
  const feed = document.getElementById('messagesFeed');
  if (feed) {
    requestAnimationFrame(() => {
      feed.scrollTop = feed.scrollHeight;
    });
  }
}

function sendStyleInquiryToChat(style, sizeId, lengthId, price) {
  ui.activeThreadId = 'thread-nicole';
  ui.mobileConvOpen = true;
  const sizeLabel = SIZE_OPTIONS.find((s) => s.id === sizeId)?.label || 'Medium';
  const lenLabel = LENGTH_OPTIONS.find((l) => l.id === lengthId)?.label || 'Midback';

  store.sendMessage({
    threadId: 'thread-nicole',
    sender: 'client',
    senderName: 'You',
    text: `Hi Nicole! 💙 I love "${style.name}" in ${sizeLabel} (${lenLabel} • ${formatPula(price)}). Do you have availability for this look?`,
    image: style.image,
    badge: `${formatPula(price)} • ${sizeLabel}`,
    styleName: style.name
  });

  switchTab('messages');
  triggerSalonSmartAutoReply(`availability for ${style.name}`, style.name);
}

function triggerSalonSmartAutoReply(clientText, styleName = '') {
  if (ui.activeThreadId === 'thread-promos') return;
  const typing = document.getElementById('typingIndicator');
  typing?.classList.remove('hidden');
  scrollMessagesBottom();

  setTimeout(() => {
    typing?.classList.add('hidden');
    const reply = store.generateLocalSalonReply(clientText, styleName);
    store.sendMessage({
      threadId: ui.activeThreadId,
      sender: 'salon',
      senderName: ui.activeThreadId === 'thread-care' ? 'Nicky • Stylist' : 'Nicole',
      text: reply
    });
    scrollMessagesBottom();
  }, 620);
}

/* ================= SALON STUDIO: ADD HAIRSTYLE & ADVERTISE ================= */
function renderStudio() {
  const metrics = document.getElementById('studioMetrics');
  const promosGrid = document.getElementById('studioPromosGrid');
  const stylesList = document.getElementById('studioStylesList');
  if (!metrics || !promosGrid || !stylesList) return;

  const activeAds = store.state.promotions.filter((p) => p.active).length;
  const confirmedBookings = store.state.bookings.filter((b) => b.status !== 'Cancelled');
  const estRevenue = confirmedBookings.reduce((sum, b) => sum + Number(b.total || 0), 0);

  metrics.innerHTML = `
    <div class="metric-box">
      <strong>${store.state.styles.length}</strong>
      <span>Live Hairstyles</span>
    </div>
    <div class="metric-box">
      <strong>${activeAds}</strong>
      <span>Active Adverts</span>
    </div>
    <div class="metric-box">
      <strong>${confirmedBookings.length}</strong>
      <span>Appointments</span>
    </div>
    <div class="metric-box">
      <strong>${formatPula(estRevenue)}</strong>
      <span>Booked Value</span>
    </div>
  `;

  promosGrid.innerHTML = store.state.promotions
    .map(
      (p) => `
      <article class="studio-promo-card">
        <div class="sp-img">
          <img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy" />
          <span class="sp-status ${p.active ? '' : 'paused'}">${p.active ? '● LIVE' : 'PAUSED'}</span>
        </div>
        <div class="sp-body">
          <span class="eyebrow-chip gold" style="justify-self:start; margin:0;">
            CODE: ${esc(p.code)} • ${p.discountPercent}% OFF
          </span>
          <strong>${esc(p.title)}</strong>
          <p class="muted-sub" style="margin:0;">${esc(p.subtitle)}</p>
          <div class="sp-actions">
            <button type="button" class="flyer-cta" data-studio-flyer="${esc(p.id)}">
              🎨 Poster Flyer
            </button>
            <button type="button" data-toggle-promo="${esc(p.id)}">
              ${p.active ? '⏸ Pause' : '▶ Activate'}
            </button>
            <button type="button" data-del-promo="${esc(p.id)}">🗑️</button>
          </div>
        </div>
      </article>
    `
    )
    .join('');

  promosGrid.querySelectorAll('[data-studio-flyer]').forEach((b) => {
    b.addEventListener('click', () => {
      const p = store.state.promotions.find((x) => x.id === b.dataset.studioFlyer);
      if (p) openFlyerGeneratorModal(p);
    });
  });

  promosGrid.querySelectorAll('[data-toggle-promo]').forEach((b) => {
    b.addEventListener('click', async () => {
      const updated = await store.togglePromotion(b.dataset.togglePromo);
      if (updated) showToast(`${updated.title} ${updated.active ? 'activated' : 'paused'}`);
    });
  });

  promosGrid.querySelectorAll('[data-del-promo]').forEach((b) => {
    b.addEventListener('click', async () => {
      await store.deletePromotion(b.dataset.delPromo);
      showToast('Advertisement removed');
    });
  });

  stylesList.innerHTML = store.state.styles
    .map((s) => {
      const p = calculateStylePrice(s, s.defaultSize, s.defaultLength);
      return `
        <div class="studio-style-row">
          <img src="${esc(s.image)}" alt="${esc(s.name)}" loading="lazy" />
          <div>
            <strong>${esc(s.name)}</strong>
            <small>${esc(s.category)} • From ${formatPula(p)}</small>
          </div>
          ${
            s.isCustom
              ? `<button type="button" class="del-mini-btn" data-del-style="${esc(s.id)}">Delete</button>`
              : `<span class="subtle-pill" style="margin-left:auto;">Official</span>`
          }
        </div>
      `;
    })
    .join('');

  stylesList.querySelectorAll('[data-del-style]').forEach((b) => {
    b.addEventListener('click', async () => {
      await store.deleteStyle(b.dataset.delStyle);
      showToast('Custom hairstyle removed');
    });
  });
}

function prepareAddStyleModal() {
  const presets = document.getElementById('newStylePresetThumbs');
  if (presets) {
    presets.innerHTML = store.state.styles
      .slice(0, 8)
      .map(
        (s) => `
        <button type="button" class="${ui.newStyleImage === s.image ? 'active' : ''}" data-preset-img="${esc(s.image)}">
          <img src="${esc(s.image)}" alt="" />
        </button>
      `
      )
      .join('');

    presets.querySelectorAll('[data-preset-img]').forEach((b) => {
      b.addEventListener('click', () => {
        ui.newStyleImage = b.dataset.presetImg;
        document.getElementById('newStylePreviewImg').src = ui.newStyleImage;
        prepareAddStyleModal();
      });
    });
  }
  openModal('addStyleModal');
}

function prepareCreatePromoModal() {
  const sel = document.getElementById('promoStyleSelect');
  if (sel) {
    sel.innerHTML = store.state.styles
      .map((s) => `<option value="${esc(s.id)}">${esc(s.name)}</option>`)
      .join('');
    const cur = store.state.styles[0];
    if (cur) {
      ui.newPromoImage = cur.image;
      document.getElementById('promoPreviewImg').src = cur.image;
    }
  }
  openModal('createPromoModal');
}

async function openFlyerGeneratorModal(promo) {
  showToast('Generating high-res salon flyer... 🎨');
  const { blob, dataUrl } = await renderPromoFlyerBlob(promo);
  ui.lastFlyerBlob = blob;
  ui.lastFlyerPromo = promo;

  const img = document.getElementById('generatedFlyerImg');
  const dl = document.getElementById('downloadFlyerLink');
  if (img) img.src = dataUrl;
  if (dl) {
    dl.href = dataUrl;
    dl.download = `nicole-beauty-parlour-${promo.code.toLowerCase()}.png`;
  }
  openModal('flyerPreviewModal');
}

/* ================= NOTIFICATIONS ================= */
function renderNotifications() {
  const badge = document.getElementById('notifBadge');
  const list = document.getElementById('notificationsList');
  const unreadCount = store.state.notifications.filter((n) => n.unread).length;

  if (badge) {
    badge.textContent = String(unreadCount);
    badge.classList.toggle('hidden', unreadCount === 0);
  }

  if (list) {
    list.innerHTML = store.state.notifications
      .map(
        (n) => `
        <div class="notif-card ${n.unread ? 'unread' : ''}">
          <strong>${esc(n.title)}</strong>
          <p>${esc(n.body)}</p>
          <small>${esc(n.time)}</small>
        </div>
      `
      )
      .join('');
  }
}

/* ================= RENDER ALL ================= */
function renderAll() {
  renderStories();
  renderPromoCarousel();
  renderCalculator();
  renderFeaturedAndStylists();
  renderMarketplace();
  renderBookingWizard();
  renderMyBookings();
  renderMessaging();
  renderStudio();
  renderNotifications();
}

/* ================= GLOBAL EVENT WIRING ================= */
function attachEvents() {
  // Bottom Tabbar & Quick Goto buttons
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.querySelectorAll('[data-goto]').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.goto));
  });

  document.getElementById('brandHomeBtn')?.addEventListener('click', () => switchTab('discover'));

  // Modal Dismissals
  document.querySelectorAll('[data-close-modal]').forEach((el) => {
    el.addEventListener('click', () => closeModal(el.dataset.closeModal));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllModals();
  });

  // Story prev/next
  document.getElementById('storyPrevBtn')?.addEventListener('click', () => openStoryAt(ui.storyIndex - 1));
  document.getElementById('storyNextBtn')?.addEventListener('click', () => openStoryAt(ui.storyIndex + 1));

  // Price Sheet Modal & Tabs
  const openPriceModal = (showPoster = false) => {
    renderPriceSheetModal();
    document.getElementById('priceTabInteractive')?.classList.toggle('active', !showPoster);
    document.getElementById('priceTabPoster')?.classList.toggle('active', showPoster);
    document.getElementById('interactivePriceTableWrap')?.classList.toggle('hidden', showPoster);
    document.getElementById('originalPosterWrap')?.classList.toggle('hidden', !showPoster);
    openModal('priceSheetModal');
  };

  document.getElementById('openPriceSheetBtn')?.addEventListener('click', () => openPriceModal(false));
  document.getElementById('viewOriginalPosterBtn')?.addEventListener('click', () => openPriceModal(true));
  document.getElementById('priceTabInteractive')?.addEventListener('click', () => openPriceModal(false));
  document.getElementById('priceTabPoster')?.addEventListener('click', () => openPriceModal(true));

  // Price Calculator controls
  document.querySelectorAll('#calcTypeToggle .seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.calcMode = btn.dataset.mode;
      renderCalculator();
    });
  });

  document.getElementById('calcBookNowBtn')?.addEventListener('click', () => {
    if (ui.calcMode === 'flat') {
      startBookingForStyle('style-13', 'medium', 'midback');
    } else {
      startBookingForStyle('style-01', ui.calcSize, ui.calcLength);
    }
  });

  // Marketplace Filters
  document.getElementById('styleSearchInput')?.addEventListener('input', (e) => {
    ui.searchQuery = e.target.value;
    renderMarketplace();
  });

  document.getElementById('savedOnlyToggle')?.addEventListener('click', () => {
    ui.savedOnly = !ui.savedOnly;
    renderMarketplace();
  });

  document.getElementById('marketSortSelect')?.addEventListener('change', (e) => {
    ui.sortBy = e.target.value;
    renderMarketplace();
  });

  // Booking Form Events
  document.getElementById('bookSizeSelect')?.addEventListener('change', (e) => {
    ui.bookSize = e.target.value;
    renderBookingWizard();
  });

  document.getElementById('bookLengthSelect')?.addEventListener('change', (e) => {
    ui.bookLength = e.target.value;
    renderBookingWizard();
  });

  document.getElementById('bookDateInput')?.addEventListener('change', (e) => {
    if (e.target.value) {
      ui.bookDate = e.target.value;
      renderBookingWizard();
    }
  });

  document.getElementById('applyPromoBtn')?.addEventListener('click', () => {
    applyPromoCodeByText(document.getElementById('bookPromoInput')?.value);
  });

  document.getElementById('bookingForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const clientName = document.getElementById('bookClientName')?.value.trim();
    const clientPhone = document.getElementById('bookClientPhone')?.value.trim();

    if (!clientName || !clientPhone) {
      showToast('Please enter your name and WhatsApp/phone number 💙');
      document.getElementById(!clientName ? 'bookClientName' : 'bookClientPhone')?.focus();
      return;
    }

    const { style, selectedAddOns, subtotal, discount, total, deposit } = getBookingTotals();
    const sizeObj = SIZE_OPTIONS.find((s) => s.id === ui.bookSize);
    const lenObj = LENGTH_OPTIONS.find((l) => l.id === ui.bookLength);
    const stylistObj = STYLISTS.find((st) => st.id === ui.bookStylistId);

    const created = await store.createBooking({
      clientName,
      clientPhone,
      styleId: style.id,
      styleName: style.name,
      styleImage: style.image,
      size: ui.bookSize,
      sizeLabel: style.pricingMode === 'flat' ? 'Standard' : sizeObj?.label || 'Medium',
      length: ui.bookLength,
      lengthLabel: lenObj?.label || 'Midback',
      stylistId: ui.bookStylistId,
      stylistName: stylistObj?.name || 'Nicole',
      date: ui.bookDate,
      time: ui.bookTime,
      addOns: selectedAddOns.map((a) => a.name),
      promoCode: ui.appliedPromo?.code || '',
      subtotal,
      discount,
      total,
      deposit,
      paymentMethod: document.getElementById('bookPaymentSelect')?.value || 'Orange Money (72517904)',
      notes: document.getElementById('bookNotesInput')?.value.trim() || ''
    });

    showToast(`Appointment ${created.id} confirmed! 🎉👑`);
    openBookingPassModal(created);
  });

  // Messaging Events
  document.getElementById('backToThreadsBtn')?.addEventListener('click', () => {
    ui.mobileConvOpen = false;
    renderMessaging();
  });

  document.querySelectorAll('.sender-mode-switch .mode-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      ui.senderMode = chip.dataset.sender;
      renderMessaging();
      showToast(
        ui.senderMode === 'salon'
          ? 'Switched to Salon Reply mode (Nicole) 👑'
          : 'Switched to Client chat mode 👤'
      );
    });
  });

  document.querySelectorAll('#chatQuickPrompts [data-prompt]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const prompt = btn.dataset.prompt;
      store.sendMessage({
        threadId: ui.activeThreadId,
        sender: 'client',
        senderName: 'You',
        text: prompt
      });
      scrollMessagesBottom();
      triggerSalonSmartAutoReply(prompt);
    });
  });

  document.getElementById('attachStyleCardChatBtn')?.addEventListener('click', () => {
    const pick = store.state.styles[Math.floor(Math.random() * Math.min(6, store.state.styles.length))];
    if (!pick) return;
    const p = calculateStylePrice(pick, pick.defaultSize, pick.defaultLength);
    ui.pendingChatAttachment = {
      image: pick.image,
      label: `${pick.name} (${formatPula(p)})`,
      styleName: pick.name
    };
    document.getElementById('chatAttachImg').src = pick.image;
    document.getElementById('chatAttachLabel').textContent = ui.pendingChatAttachment.label;
    document.getElementById('chatAttachmentPreview')?.classList.remove('hidden');
  });

  document.getElementById('chatPhotoInput')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file, 840, 0.8);
      ui.pendingChatAttachment = { image: dataUrl, label: file.name, styleName: '' };
      document.getElementById('chatAttachImg').src = dataUrl;
      document.getElementById('chatAttachLabel').textContent = `📷 ${file.name}`;
      document.getElementById('chatAttachmentPreview')?.classList.remove('hidden');
    } catch {
      showToast('Could not attach image');
    }
    e.target.value = '';
  });

  document.getElementById('clearChatAttachBtn')?.addEventListener('click', () => {
    ui.pendingChatAttachment = null;
    document.getElementById('chatAttachmentPreview')?.classList.add('hidden');
  });

  document.getElementById('chatComposerForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('chatMessageInput');
    const text = input?.value.trim() || '';
    if (!text && !ui.pendingChatAttachment) return;

    const attachment = ui.pendingChatAttachment;
    store.sendMessage({
      threadId: ui.activeThreadId,
      sender: ui.senderMode,
      senderName: ui.senderMode === 'salon' ? 'Nicole • Salon' : 'You',
      text: text || (attachment ? `Sharing hairstyle inspiration: ${attachment.label}` : ''),
      image: attachment?.image || null,
      badge: attachment?.styleName ? 'STYLE INQUIRY' : null,
      styleName: attachment?.styleName || ''
    });

    if (input) input.value = '';
    ui.pendingChatAttachment = null;
    document.getElementById('chatAttachmentPreview')?.classList.add('hidden');
    scrollMessagesBottom();

    if (ui.senderMode === 'client') {
      triggerSalonSmartAutoReply(text, attachment?.styleName || '');
    }
  });

  // Add Hairstyle Modal Triggers & Form
  ['quickAddStyleBtn', 'marketAddStyleBtn', 'studioAddStyleBtn', 'newStyleInlineBtn'].forEach((id) => {
    document.getElementById(id)?.addEventListener('click', prepareAddStyleModal);
  });

  document.getElementById('newStylePricingMode')?.addEventListener('change', (e) => {
    const isFlat = e.target.value === 'flat';
    document.getElementById('newStyleFlatPriceWrap')?.classList.toggle('hidden', !isFlat);
    document.getElementById('newStyleDefaultSizeWrap')?.classList.toggle('hidden', isFlat);
  });

  document.getElementById('newStylePhotoInput')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      ui.newStyleImage = await compressImageFile(file, 960, 0.84);
      document.getElementById('newStylePreviewImg').src = ui.newStyleImage;
      showToast('Hairstyle photo uploaded! ✨');
    } catch {
      showToast('Could not read photo');
    }
  });

  document.getElementById('addStyleForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('newStyleName')?.value.trim();
    if (!name) {
      showToast('Please enter a hairstyle name');
      return;
    }
    const pricingMode = document.getElementById('newStylePricingMode')?.value || 'matrix';
    await store.addStyle({
      name,
      category: document.getElementById('newStyleCategory')?.value || 'Knotless',
      image: ui.newStyleImage,
      pricingMode,
      flatPrice: Number(document.getElementById('newStyleFlatPrice')?.value || 250),
      defaultSize: document.getElementById('newStyleDefaultSize')?.value || 'medium',
      defaultLength: 'midback',
      duration: document.getElementById('newStyleDuration')?.value.trim() || '4 – 5 hrs',
      packs: document.getElementById('newStylePacks')?.value.trim() || '5–6 packs',
      badge: document.getElementById('newStyleBadge')?.value.trim() || 'New Drop ✨',
      description:
        document.getElementById('newStyleDesc')?.value.trim() ||
        'Fresh custom braid & twist creation by Nicole Beauty Parlour.',
      tags: ['Custom Upload', 'Pain-Free']
    });

    e.target.reset();
    closeModal('addStyleModal');
    showToast(`"${name}" added to the live Market! 🎉`);
    switchTab('styles');
  });

  // Advertise / Create Promo Modal Triggers & Form
  ['quickAdvertiseBtn', 'studioCreatePromoBtn', 'newPromoInlineBtn'].forEach((id) => {
    document.getElementById(id)?.addEventListener('click', prepareCreatePromoModal);
  });

  document.getElementById('promoStyleSelect')?.addEventListener('change', (e) => {
    const picked = store.state.styles.find((s) => s.id === e.target.value);
    if (picked) {
      ui.newPromoImage = picked.image;
      document.getElementById('promoPreviewImg').src = picked.image;
    }
  });

  document.getElementById('promoPhotoInput')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      ui.newPromoImage = await compressImageFile(file, 960, 0.84);
      document.getElementById('promoPreviewImg').src = ui.newPromoImage;
      showToast('Custom promo banner photo ready! 📸');
    } catch {
      showToast('Could not process image');
    }
  });

  document.getElementById('createPromoForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('promoTitleInput')?.value.trim();
    const code = document.getElementById('promoCodeInput')?.value.trim();
    if (!title || !code) {
      showToast('Please enter a campaign headline and promo code');
      return;
    }

    const createdPromo = await store.createPromotion({
      title,
      subtitle:
        document.getElementById('promoSubtitleInput')?.value.trim() ||
        'Special salon promotion at Nicole Beauty Parlour!',
      discountPercent: Number(document.getElementById('promoDiscountInput')?.value || 20),
      code,
      styleId: document.getElementById('promoStyleSelect')?.value || 'style-01',
      image: ui.newPromoImage,
      priceHighlight: document.getElementById('promoHighlightInput')?.value.trim() || 'Special Rate',
      validUntil: document.getElementById('promoValidUntilInput')?.value || '2026-12-31',
      theme: document.getElementById('promoThemeSelect')?.value || 'royal-sky',
      badge: 'FLASH ADVERT'
    });

    closeModal('createPromoModal');
    showToast(`Advert "${createdPromo.title}" is now LIVE! 🔥`);
    await openFlyerGeneratorModal(createdPromo);
  });

  // Share Flyer via Web Share API
  document.getElementById('shareFlyerNativeBtn')?.addEventListener('click', async () => {
    const promo = ui.lastFlyerPromo;
    if (!promo) return;
    const shareText = `👑 ${promo.title} at Nicole Beauty Parlour!\n${promo.subtitle}\nUse code ${promo.code} (${promo.discountPercent}% OFF) • Call/WhatsApp ${SALON_INFO.phoneDisplay}`;

    try {
      if (navigator.share && ui.lastFlyerBlob) {
        const file = new File([ui.lastFlyerBlob], `nicole-promo-${promo.code}.png`, {
          type: 'image/png'
        });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ title: promo.title, text: shareText, files: [file] });
          return;
        }
        await navigator.share({ title: promo.title, text: shareText });
        return;
      }
    } catch {
      // User cancelled share sheet or browser fallback
    }

    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  });

  // Notifications & Install App Modals
  document.getElementById('openNotificationsBtn')?.addEventListener('click', () => {
    store.markNotificationsRead();
    openModal('notificationsModal');
  });

  document.getElementById('openInstallModalBtn')?.addEventListener('click', () => {
    openModal('installAppModal');
  });

  document.getElementById('replaySplashBtn')?.addEventListener('click', () => {
    closeModal('installAppModal');
    runSplashSequence(false);
  });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    ui.deferredInstallPrompt = e;
    document.getElementById('triggerNativeInstallBtn')?.classList.remove('hidden');
  });

  document.getElementById('triggerNativeInstallBtn')?.addEventListener('click', async () => {
    if (!ui.deferredInstallPrompt) return;
    ui.deferredInstallPrompt.prompt();
    await ui.deferredInstallPrompt.userChoice;
    ui.deferredInstallPrompt = null;
    document.getElementById('triggerNativeInstallBtn')?.classList.add('hidden');
  });

  // Auto-advance Promo Carousel gently
  setInterval(() => {
    if (ui.activeTab !== 'discover') return;
    const wrap = document.getElementById('promoCarousel');
    const dots = document.querySelectorAll('#promoDots .promo-dot');
    if (!wrap || dots.length <= 1) return;
    ui.promoSlideIndex = (ui.promoSlideIndex + 1) % dots.length;
    wrap.scrollTo({ left: wrap.clientWidth * ui.promoSlideIndex, behavior: 'smooth' });
    dots.forEach((d, idx) => d.classList.toggle('active', idx === ui.promoSlideIndex));
  }, 5800);
}

/* ================= BOOTSTRAP ================= */
function init() {
  // Handle deep-link tab query (?tab=book / messages / studio)
  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get('tab');
  if (tabParam && ['discover', 'styles', 'book', 'messages', 'studio'].includes(tabParam)) {
    ui.activeTab = tabParam;
  }

  store.subscribe(() => renderAll());
  renderAll();
  if (ui.activeTab !== 'discover') switchTab(ui.activeTab);

  attachEvents();
  runSplashSequence(false);
  store.syncFromServer();

  // Register PWA Service Worker for Android/iOS offline & installability
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
}

init();

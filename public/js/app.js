import {
  SALON_INFO,
  SIZE_OPTIONS,
  LENGTH_OPTIONS,
  HAIR_COLORS,
  OFFICIAL_PRICE_MATRIX,
  SPECIALTY_FLAT_PRICE,
  CATEGORIES,
  ADD_ONS,
  STYLISTS,
  TIME_SLOTS,
  calculateStylePrice
} from './data.js';
import { SalonStore } from './store.js';
import {
  compressImageFile,
  renderPromoFlyerToCanvas,
  renderPromoFlyerBlob
} from './flyer.js';

const store = new SalonStore();

const ui = {
  theme: localStorage.getItem('nbp_theme_v2') || 'dark',
  activeTab: 'discover',
  coverflowIndex: 0,
  // Architect calculator state
  calcMode: 'matrix',
  calcSize: 'medium',
  calcLength: 'midback',
  lastDisplayedPrice: 180,
  // Gallery filters
  searchQuery: '',
  selectedCategory: 'all',
  savedOnly: false,
  sortBy: 'featured',
  // Booking state
  bookStyleId: 'style-01',
  bookSize: 'medium',
  bookLength: 'midback',
  bookColorId: '27',
  bookStylistId: 'nicole',
  bookDate: getUpcomingDates(14)[1]?.iso || getUpcomingDates(14)[0].iso,
  bookTime: '09:00',
  bookAddOnIds: new Set(),
  appliedPromo: null,
  // Virtual Style Mirror state
  mirrorTab: 'selfie',
  mirrorStyleId: 'style-01',
  mirrorColorId: '27',
  mirrorSelfieSrc: '/images/style-06-golden-velvet-updo.jpg',
  quizBudget: 300,
  quizVibe: 'all',
  // Concierge chat state
  activeThreadId: 'thread-nicole',
  mobileConvOpen: true,
  senderMode: 'client',
  pendingChatAttachment: null,
  // Studio & Admin Vault state
  adminPane: 'overview',
  adminBookingQuery: '',
  adminBookingStatus: 'All',
  adminStyleQuery: '',
  pendingAdminCallback: null,
  newStyleImage: '/images/style-01-honey-curly-knotless.jpg',
  newPromoCustomImage: null,
  lastFlyerBlob: null,
  lastFlyerPromo: null,
  deferredInstallPrompt: null,
  storyIndex: 0,
  storyTimer: null
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

/* ================= ICE-CYAN CONFETTI CELEBRATION ================= */
function launchIceConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const palette = ['#29ABE2', '#56CCF2', '#DFF3FE', '#FFFFFF', '#0B7BC1'];
  const pieces = Array.from({ length: 68 }, () => ({
    x: canvas.width * (0.25 + Math.random() * 0.5),
    y: canvas.height * 0.35,
    vx: (Math.random() - 0.5) * 13,
    vy: -Math.random() * 12 - 4,
    size: 5 + Math.random() * 6,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.25,
    color: palette[Math.floor(Math.random() * palette.length)],
    alpha: 1
  }));

  let frame = 0;
  function tick() {
    frame++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of pieces) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.34;
      p.rot += p.vr;
      if (frame > 42) p.alpha -= 0.025;
      if (p.alpha > 0 && p.y < canvas.height + 20) {
        alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
    }
    if (alive && frame < 110) requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  requestAnimationFrame(tick);
}

/* ================= THEME MANAGEMENT ================= */
function applyTheme(theme) {
  ui.theme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', ui.theme);
  localStorage.setItem('nbp_theme_v2', ui.theme);
  const meta = document.getElementById('metaThemeColor');
  if (meta) meta.setAttribute('content', ui.theme === 'light' ? '#EAF6FE' : '#040914');
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
  const anyOpen = Array.from(document.querySelectorAll('.modal-backdrop')).some(
    (m) => !m.classList.contains('hidden')
  );
  if (!anyOpen) document.body.style.overflow = '';
}

/* ================= 3D SPLASH CANVAS & CHOREOGRAPHY ================= */
function initSplashExperience() {
  const splash = document.getElementById('splashScreen');
  const canvas = document.getElementById('splashCanvas');
  const fill = document.getElementById('splashProgressFill');
  const pctEl = document.getElementById('splashPercent');
  const statusEl = document.getElementById('splashStatusText');
  const skipBtn = document.getElementById('skipSplashBtn');

  if (!splash) return;

  let animActive = true;
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });

    const motes = Array.from({ length: 42 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 1 + Math.random() * 2.6,
      vx: (Math.random() - 0.5) * 0.45,
      vy: -0.25 - Math.random() * 0.55,
      alpha: 0.2 + Math.random() * 0.65
    }));

    const renderCanvas = () => {
      if (!animActive) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const m of motes) {
        m.x += m.vx;
        m.y += m.vy;
        if (m.y < -10) m.y = canvas.height + 10;
        if (m.x < -10) m.x = canvas.width + 10;
        if (m.x > canvas.width + 10) m.x = -10;

        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(86, 204, 242, ${m.alpha})`;
        ctx.fill();
      }
      requestAnimationFrame(renderCanvas);
    };
    requestAnimationFrame(renderCanvas);
  }

  const lines = [
    'Illuminating the Gaborone Crown Runway...',
    'Preparing tension-free Knotless & French Curls...',
    'Calibrating official BWP Parlour Price Architect...',
    'Look Good • Feel Good • Be You'
  ];

  let pct = 0;
  let dismissed = false;

  const finishSplash = () => {
    if (dismissed) return;
    dismissed = true;
    animActive = false;
    splash.classList.add('exit');
  };

  skipBtn?.addEventListener('click', finishSplash);

  const timer = setInterval(() => {
    pct = Math.min(100, pct + 5);
    if (fill) fill.style.width = `${pct}%`;
    if (pctEl) pctEl.textContent = `${pct}%`;
    if (statusEl) {
      const idx = Math.min(lines.length - 1, Math.floor((pct / 100) * lines.length));
      statusEl.textContent = lines[idx];
    }
    if (pct >= 100) {
      clearInterval(timer);
      setTimeout(finishSplash, 240);
    }
  }, 85);
}

/* ================= TAB NAVIGATION ================= */
function switchTab(tabId) {
  ui.activeTab = tabId;
  document.querySelectorAll('.app-view').forEach((sec) => {
    sec.classList.toggle('active', sec.id === `view-${tabId}`);
  });
  document.querySelectorAll('.dock-item').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  if (tabId === 'messages') {
    store.markThreadRead(ui.activeThreadId);
    scrollChatBottom();
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ================= STORIES LOOKBOOK ================= */
function getStoryItems() {
  const styles = store.state.styles.slice(0, 6);
  return [
    {
      title: 'Official BWP Price Menu',
      sub: 'Jumbo P130 → Small P500 • Softdread P250',
      image: SALON_INFO.priceSheetImage,
      caption: 'Exact @NICOLE_BEAUTY_PARLOUR Gaborone rates — zero hidden charges.',
      cta: 'Open Full Price Table',
      action: () => openModal('priceSheetModal')
    },
    ...styles.map((s) => ({
      title: s.name,
      sub: `${s.category} • From ${formatPula(calculateStylePrice(s, s.defaultSize, s.defaultLength))}`,
      image: s.image,
      caption: `${s.description} (${s.duration} • ${s.packs})`,
      cta: `Reserve ${s.name.split(' ')[0]} Look`,
      action: () => jumpToBookingWithStyle(s.id, s.defaultSize, s.defaultLength)
    }))
  ];
}

function renderStoriesBar() {
  const bar = document.getElementById('storiesBar');
  if (!bar) return;
  const stories = getStoryItems();
  bar.innerHTML = stories
    .map(
      (item, idx) => `
      <button type="button" class="story-orb-item" data-story-idx="${idx}">
        <div class="story-ring">
          <div class="story-ring-inner">
            <img src="${esc(item.image)}" alt="${esc(item.title)}" loading="lazy" />
          </div>
        </div>
        <span>${esc(idx === 0 ? 'Price Menu' : item.title.split(' ').slice(0, 2).join(' '))}</span>
      </button>
    `
    )
    .join('');

  bar.querySelectorAll('[data-story-idx]').forEach((btn) => {
    btn.addEventListener('click', () => openStoryAt(Number(btn.dataset.storyIdx)));
  });
}

function openStoryAt(index) {
  const stories = getStoryItems();
  if (!stories.length) return;
  ui.storyIndex = (index + stories.length) % stories.length;
  const item = stories[ui.storyIndex];

  const track = document.getElementById('storyProgressTrack');
  const titleEl = document.getElementById('storyTitleText');
  const subEl = document.getElementById('storySubText');
  const imgEl = document.getElementById('storyMainImage');
  const capEl = document.getElementById('storyCaptionText');
  const actBtn = document.getElementById('storyActionBtn');

  if (track) {
    track.innerHTML = stories
      .map(
        (_, i) => `
        <div class="story-seg">
          <div class="story-seg-fill" style="width:${i < ui.storyIndex ? '100%' : '0%'};${
          i === ui.storyIndex ? 'transition: width 4600ms linear;' : ''
        }"></div>
        </div>`
      )
      .join('');
    requestAnimationFrame(() => {
      const fills = track.querySelectorAll('.story-seg-fill');
      if (fills[ui.storyIndex]) fills[ui.storyIndex].style.width = '100%';
    });
  }

  if (titleEl) titleEl.textContent = item.title;
  if (subEl) subEl.textContent = item.sub;
  if (imgEl) imgEl.src = item.image;
  if (capEl) capEl.textContent = item.caption;
  if (actBtn) {
    actBtn.textContent = item.cta;
    actBtn.onclick = () => {
      closeModal('storyModal');
      item.action();
    };
  }

  openModal('storyModal');
  if (ui.storyTimer) clearTimeout(ui.storyTimer);
  ui.storyTimer = setTimeout(() => {
    if (ui.storyIndex < stories.length - 1) openStoryAt(ui.storyIndex + 1);
    else closeModal('storyModal');
  }, 4600);
}

/* ================= INTERACTIVE 3D COVERFLOW HERO ================= */
function getCoverflowStyles() {
  const featured = store.state.styles.filter((s) => s.featured);
  return (featured.length >= 5 ? featured : store.state.styles).slice(0, 7);
}

function renderCoverflow() {
  const list = getCoverflowStyles();
  const stage = document.getElementById('coverflowStage');
  const titleEl = document.getElementById('coverflowActiveTitle');
  const spotBar = document.getElementById('coverflowSpotlightBar');
  const aura = document.getElementById('heroDynamicAura');

  if (!stage || !list.length) return;
  ui.coverflowIndex = ((ui.coverflowIndex % list.length) + list.length) % list.length;
  const activeStyle = list[ui.coverflowIndex];

  if (aura) aura.style.backgroundImage = `url('${activeStyle.image}')`;
  if (titleEl) titleEl.textContent = activeStyle.name;

  stage.innerHTML = list
    .map((style, idx) => {
      let diff = idx - ui.coverflowIndex;
      const half = Math.floor(list.length / 2);
      if (diff > half) diff -= list.length;
      if (diff < -half) diff += list.length;

      const abs = Math.abs(diff);
      const visible = abs <= 2;
      const tx = diff * 148;
      const tz = -abs * 115;
      const ry = -diff * 26;
      const scale = diff === 0 ? 1 : abs === 1 ? 0.86 : 0.74;
      const opacity = !visible ? 0 : diff === 0 ? 1 : abs === 1 ? 0.78 : 0.42;
      const zIdx = 20 - abs * 4;
      const startPrice = calculateStylePrice(style, style.defaultSize, style.defaultLength);

      return `
        <article
          class="cf-card ${diff === 0 ? 'is-active' : ''}"
          data-cf-idx="${idx}"
          data-style-id="${esc(style.id)}"
          style="transform: translate3d(${tx}px, 0, ${tz}px) rotateY(${ry}deg) scale(${scale}); opacity: ${opacity}; z-index: ${zIdx}; pointer-events: ${visible ? 'auto' : 'none'};"
        >
          <img src="${esc(style.image)}" alt="${esc(style.name)}" />
          <div class="cf-card-overlay">
            <span>${esc(style.badge || style.category)}</span>
            <strong class="cf-price-pill">${formatPula(startPrice)}</strong>
          </div>
        </article>
      `;
    })
    .join('');

  stage.querySelectorAll('.cf-card').forEach((card) => {
    card.addEventListener('click', () => {
      const idx = Number(card.dataset.cfIdx);
      if (idx === ui.coverflowIndex) {
        openStyleConfigurator(card.dataset.styleId);
      } else {
        ui.coverflowIndex = idx;
        renderCoverflow();
      }
    });
  });

  if (spotBar) {
    const price = calculateStylePrice(activeStyle, activeStyle.defaultSize, activeStyle.defaultLength);
    spotBar.innerHTML = `
      <div class="cf-spot-meta">
        <strong>${formatPula(price)}</strong>
        <span>${esc(activeStyle.category)} • ${esc(activeStyle.duration)} • ${esc(activeStyle.packs)}</span>
      </div>
      <div class="cf-spot-actions">
        <button type="button" class="lux-pill-btn" id="cfMirrorQuickBtn">Try in Mirror</button>
        <button type="button" class="lux-pill-btn" id="cfCustomizeQuickBtn">Customize</button>
        <button type="button" class="btn-couture-primary sm" id="cfBookQuickBtn">Book Look</button>
      </div>
    `;
    document.getElementById('cfMirrorQuickBtn')?.addEventListener('click', () => {
      ui.mirrorStyleId = activeStyle.id;
      openMirrorModal('selfie');
    });
    document.getElementById('cfCustomizeQuickBtn')?.addEventListener('click', () => {
      openStyleConfigurator(activeStyle.id);
    });
    document.getElementById('cfBookQuickBtn')?.addEventListener('click', () => {
      jumpToBookingWithStyle(activeStyle.id, activeStyle.defaultSize, activeStyle.defaultLength);
    });
  }
}

/* ================= VISUAL SILHOUETTE BRAID ARCHITECT ================= */
function animatePriceOdometer(el, fromVal, toVal) {
  if (!el) return;
  if (fromVal === toVal) {
    el.textContent = formatPula(toVal);
    return;
  }
  const start = performance.now();
  const dur = 320;
  function step(now) {
    const t = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - t, 3);
    const cur = Math.round(fromVal + (toVal - fromVal) * eased);
    el.textContent = formatPula(cur);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function renderArchitect() {
  const modeMatrixBtn = document.getElementById('calcModeMatrixBtn');
  const modeFlatBtn = document.getElementById('calcModeFlatBtn');
  const matrixWrap = document.getElementById('calcMatrixControls');
  const flatWrap = document.getElementById('calcFlatBanner');
  const sizeRow = document.getElementById('calcSizeRow');
  const lenRow = document.getElementById('calcLengthRow');
  const sizeHint = document.getElementById('calcSizeHint');
  const lenHint = document.getElementById('calcLengthHint');
  const priceEl = document.getElementById('calcPriceOutput');
  const metaEl = document.getElementById('calcMetaOutput');
  const gaugeEl = document.getElementById('strandGaugeLabel');

  const isMatrix = ui.calcMode === 'matrix';
  modeMatrixBtn?.classList.toggle('active', isMatrix);
  modeFlatBtn?.classList.toggle('active', !isMatrix);
  matrixWrap?.classList.toggle('hidden', !isMatrix);
  flatWrap?.classList.toggle('hidden', isMatrix);

  if (sizeRow) {
    sizeRow.innerHTML = SIZE_OPTIONS.map(
      (s) => `
      <button type="button" class="choice-chip ${ui.calcSize === s.id ? 'active' : ''}" data-calc-size="${s.id}">
        ${esc(s.short)}
      </button>`
    ).join('');
    sizeRow.querySelectorAll('[data-calc-size]').forEach((btn) => {
      btn.addEventListener('click', () => {
        ui.calcSize = btn.dataset.calcSize;
        renderArchitect();
      });
    });
  }

  if (lenRow) {
    lenRow.innerHTML = LENGTH_OPTIONS.map(
      (l) => `
      <button type="button" class="choice-chip ${ui.calcLength === l.id ? 'active' : ''}" data-calc-len="${l.id}">
        ${esc(l.label)}
      </button>`
    ).join('');
    lenRow.querySelectorAll('[data-calc-len]').forEach((btn) => {
      btn.addEventListener('click', () => {
        ui.calcLength = btn.dataset.calcLen;
        renderArchitect();
      });
    });
  }

  const sizeObj = SIZE_OPTIONS.find((s) => s.id === ui.calcSize) || SIZE_OPTIONS[2];
  const lenObj = LENGTH_OPTIONS.find((l) => l.id === ui.calcLength) || LENGTH_OPTIONS[0];
  if (sizeHint) sizeHint.textContent = sizeObj.label;
  if (lenHint) lenHint.textContent = lenObj.label;

  const computedPrice = isMatrix
    ? OFFICIAL_PRICE_MATRIX[ui.calcSize]?.[ui.calcLength] ?? 180
    : SPECIALTY_FLAT_PRICE;
  const deposit = Math.round(computedPrice * 0.3);

  animatePriceOdometer(priceEl, ui.lastDisplayedPrice, computedPrice);
  ui.lastDisplayedPrice = computedPrice;

  if (metaEl) {
    metaEl.textContent = isMatrix
      ? `${sizeObj.durationHrs} • ${sizeObj.packs} • 30% Deposit ${formatPula(deposit)}`
      : `3.5 – 4.5 hrs • 5 packs • 30% Deposit ${formatPula(deposit)}`;
  }

  if (gaugeEl) {
    gaugeEl.textContent = isMatrix
      ? `${sizeObj.label} Strands • ${lenObj.label} • ${sizeObj.packs}`
      : `Pick n' Drop / Softdread • Official Flat P250`;
  }

  // Update SVG Silhouette Braids & Laser Marker!
  const endY = !isMatrix ? 210 : ui.calcLength === 'midback' ? 152 : ui.calcLength === 'butt' ? 230 : 304;
  const sw = !isMatrix ? 6.8 : sizeObj.strandWidth;
  const strandDefs = [
    ['strand1', `M122 46 Q114 ${(46 + endY) / 2} 116 ${endY}`],
    ['strand2', `M131 42 Q127 ${(42 + endY) / 2} 128 ${endY}`],
    ['strand3', `M140 40 Q140 ${(40 + endY) / 2} 140 ${endY}`],
    ['strand4', `M149 42 Q153 ${(42 + endY) / 2} 152 ${endY}`],
    ['strand5', `M158 46 Q166 ${(46 + endY) / 2} 164 ${endY}`]
  ];
  for (const [id, d] of strandDefs) {
    const pathEl = document.getElementById(id);
    if (pathEl) {
      pathEl.setAttribute('d', d);
      pathEl.setAttribute('stroke-width', String(sw));
    }
  }

  const laserGroup = document.getElementById('svgLaserGroup');
  const laserPrice = document.getElementById('svgLaserPrice');
  if (laserGroup) {
    laserGroup.style.transform = `translateY(${endY - 152}px)`;
  }
  if (laserPrice) {
    laserPrice.textContent = formatPula(computedPrice);
  }
}

/* ================= CAMPAIGNS & HAIRSTYLE CARDS ================= */
function renderCampaigns() {
  const wrap = document.getElementById('promoCarousel');
  if (!wrap) return;
  const activePromos = store.state.promotions.filter((p) => p.active);

  if (!activePromos.length) {
    wrap.innerHTML = `<div class="studio-panel-card"><p>No active campaigns yet — launch your first promo poster from Studio!</p></div>`;
    return;
  }

  wrap.innerHTML = activePromos
    .map(
      (p) => `
      <article class="campaign-card">
        <div class="campaign-photo-head">
          <img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy" />
          <div class="campaign-top-tags">
            <span class="camp-badge">${esc(p.badge || 'VIP CAMPAIGN')}</span>
            <span class="camp-code-pill">CODE: ${esc(p.code)}</span>
          </div>
          <div class="campaign-price-float">${esc(p.priceHighlight || `${p.discountPercent}% OFF`)}</div>
        </div>
        <div class="campaign-body">
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.subtitle)}</p>
          <div class="campaign-actions">
            <button type="button" class="btn-couture-primary sm" style="flex:1" data-claim-promo="${esc(p.id)}">
              Claim ${Number(p.discountPercent || 15)}% Off
            </button>
            <button type="button" class="btn-couture-glass sm" data-export-flyer="${esc(p.id)}">
              HD Poster
            </button>
          </div>
        </div>
      </article>
    `
    )
    .join('');

  wrap.querySelectorAll('[data-claim-promo]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const promo = store.state.promotions.find((x) => x.id === btn.dataset.claimPromo);
      if (!promo) return;
      ui.appliedPromo = promo;
      if (promo.styleId) ui.bookStyleId = promo.styleId;
      const input = document.getElementById('bookPromoInput');
      if (input) input.value = promo.code;
      showToast(`Applied ${promo.code} (${promo.discountPercent}% OFF)!`);
      switchTab('book');
      renderBookingView();
    });
  });

  wrap.querySelectorAll('[data-export-flyer]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const promo = store.state.promotions.find((x) => x.id === btn.dataset.exportFlyer);
      if (promo) openFlyerPreviewModal(promo);
    });
  });
}

function buildStyleCardHtml(style, matchScore = null) {
  const startPrice = calculateStylePrice(style, style.defaultSize, style.defaultLength);
  const sizeObj = SIZE_OPTIONS.find((s) => s.id === style.defaultSize);
  const lenObj = LENGTH_OPTIONS.find((l) => l.id === style.defaultLength);
  const subtitle =
    style.pricingMode === 'flat'
      ? 'Official Flat Rate'
      : `${sizeObj?.short || 'Medium'} • ${lenObj?.label || 'Midback'}`;

  return `
    <article class="style-couture-card" data-card-style="${esc(style.id)}">
      <div class="style-media-wrap" data-open-detail="${esc(style.id)}">
        <img src="${esc(style.image)}" alt="${esc(style.name)}" loading="lazy" />
        <span class="card-badge-pill">${esc(matchScore ? `${matchScore}% Match` : style.badge || style.category)}</span>
        <button
          type="button"
          class="heart-orb-btn ${style.saved ? 'saved' : ''}"
          data-save-style="${esc(style.id)}"
          aria-label="Save hairstyle"
        >
          <svg viewBox="0 0 20 20" fill="${style.saved ? 'currentColor' : 'none'}">
            <path d="M10 16.8L3.8 10.7A4.2 4.2 0 0 1 9.8 4.8L10 5L10.2 4.8A4.2 4.2 0 0 1 16.2 10.7L10 16.8Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="card-floating-price">
          <span>${esc(subtitle)}</span>
          <strong>${formatPula(startPrice)}</strong>
        </div>
      </div>

      <div class="style-card-body">
        <div class="style-cat-rating">
          <span>${esc(style.category)}</span>
          <span>★ ${Number(style.rating || 5).toFixed(1)} (${style.reviewsCount || 12})</span>
        </div>
        <h3 data-open-detail="${esc(style.id)}">${esc(style.name)}</h3>
        <div class="style-specs-line">${esc(style.duration || '4 hrs')} • ${esc(style.packs || '5 packs')}</div>
        <div class="style-card-footer">
          <button type="button" class="btn-couture-glass sm" style="flex:1" data-open-detail="${esc(style.id)}">
            Customize
          </button>
          <button type="button" class="btn-couture-primary sm" style="flex:1" data-direct-book="${esc(style.id)}">
            Reserve
          </button>
        </div>
      </div>
    </article>
  `;
}

function wireStyleCards(container) {
  if (!container) return;
  container.querySelectorAll('[data-save-style]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const saved = store.toggleSaveStyle(btn.dataset.saveStyle);
      showToast(saved ? 'Saved to your Crown Wishlist' : 'Removed from Saved');
    });
  });
  container.querySelectorAll('[data-open-detail]').forEach((el) => {
    el.addEventListener('click', () => openStyleConfigurator(el.dataset.openDetail));
  });
  container.querySelectorAll('[data-direct-book]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const st = store.state.styles.find((s) => s.id === btn.dataset.directBook);
      if (st) jumpToBookingWithStyle(st.id, st.defaultSize, st.defaultLength);
    });
  });
}

function renderFeaturedAndBraiders() {
  const featGrid = document.getElementById('featuredStylesGrid');
  const countLbl = document.getElementById('seeAllCountLabel');
  if (countLbl) countLbl.textContent = `Explore All ${store.state.styles.length}`;

  if (featGrid) {
    const items = store.state.styles.slice(0, 6);
    featGrid.innerHTML = items.map((s) => buildStyleCardHtml(s)).join('');
    wireStyleCards(featGrid);
  }

  const strip = document.getElementById('stylistsStrip');
  if (strip) {
    strip.innerHTML = STYLISTS.slice(0, 3)
      .map(
        (st) => `
        <div class="braider-card">
          <img class="braider-avatar" src="${esc(st.avatar)}" alt="${esc(st.name)}" loading="lazy" />
          <div class="braider-info">
            <strong>${esc(st.name)} • ★ ${st.rating.toFixed(1)}</strong>
            <span class="braider-role">${esc(st.chair)} • ${esc(st.role)}</span>
            <p class="braider-spec">${esc(st.specialty)}</p>
          </div>
        </div>
      `
      )
      .join('');
  }
}

/* ================= GALLERY / MARKETPLACE VIEW ================= */
function renderGalleryView() {
  const chipsWrap = document.getElementById('categoryChipsRow');
  const grid = document.getElementById('marketStylesGrid');
  const countText = document.getElementById('marketCountText');
  const savedBtn = document.getElementById('savedFilterBtn');
  const clearBtn = document.getElementById('clearSearchBtn');

  savedBtn?.classList.toggle('active', ui.savedOnly);
  clearBtn?.classList.toggle('hidden', !ui.searchQuery);

  if (chipsWrap) {
    chipsWrap.innerHTML = CATEGORIES.map(
      (c) => `
      <button type="button" class="cat-pill ${ui.selectedCategory === c.id ? 'active' : ''}" data-cat="${esc(c.id)}">
        ${esc(c.label)}
      </button>`
    ).join('');
    chipsWrap.querySelectorAll('[data-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        ui.selectedCategory = btn.dataset.cat;
        renderGalleryView();
      });
    });
  }

  let list = [...store.state.styles];
  if (ui.selectedCategory !== 'all') {
    list = list.filter((s) => s.category === ui.selectedCategory);
  }
  if (ui.savedOnly) {
    list = list.filter((s) => s.saved);
  }
  if (ui.searchQuery.trim()) {
    const q = ui.searchQuery.toLowerCase();
    list = list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        String(s.description || '').toLowerCase().includes(q) ||
        (s.tags || []).some((t) => t.toLowerCase().includes(q)) ||
        `p${calculateStylePrice(s, s.defaultSize, s.defaultLength)}`.includes(q)
    );
  }

  if (ui.sortBy === 'price-asc') {
    list.sort(
      (a, b) =>
        calculateStylePrice(a, a.defaultSize, a.defaultLength) -
        calculateStylePrice(b, b.defaultSize, b.defaultLength)
    );
  } else if (ui.sortBy === 'price-desc') {
    list.sort(
      (a, b) =>
        calculateStylePrice(b, b.defaultSize, b.defaultLength) -
        calculateStylePrice(a, a.defaultSize, a.defaultLength)
    );
  } else if (ui.sortBy === 'rating') {
    list.sort((a, b) => (b.rating || 5) - (a.rating || 5));
  }

  if (countText) {
    countText.textContent = `${list.length} couture ${list.length === 1 ? 'hairstyle' : 'hairstyles'}`;
  }

  if (grid) {
    if (!list.length) {
      grid.innerHTML = `
        <div class="studio-panel-card" style="grid-column: 1 / -1; text-align:center;">
          <h3>No matching hairstyles found</h3>
          <p class="mt-10">Reset filters or upload a custom hairstyle from your phone camera.</p>
          <button type="button" class="btn-couture-primary sm mt-14" id="resetMarketFiltersBtn">Reset Filters</button>
        </div>
      `;
      document.getElementById('resetMarketFiltersBtn')?.addEventListener('click', () => {
        ui.searchQuery = '';
        ui.selectedCategory = 'all';
        ui.savedOnly = false;
        const inp = document.getElementById('marketSearchInput');
        if (inp) inp.value = '';
        renderGalleryView();
      });
    } else {
      grid.innerHTML = list.map((s) => buildStyleCardHtml(s)).join('');
      wireStyleCards(grid);
    }
  }
}

/* ================= STYLE CONFIGURATOR POP-UP MODAL ================= */
function openStyleConfigurator(styleId) {
  const style = store.state.styles.find((s) => s.id === styleId);
  if (!style) return;

  let selSize = style.defaultSize || 'medium';
  let selLen = style.defaultLength || 'midback';
  let selColor = style.defaultColor || '1B';

  const host = document.getElementById('styleDetailContent');
  if (!host) return;

  const paint = () => {
    const price = calculateStylePrice(style, selSize, selLen);
    const deposit = Math.round(price * 0.3);
    const shadeObj = HAIR_COLORS.find((c) => c.id === selColor) || HAIR_COLORS[0];

    host.innerHTML = `
      <div class="detail-modal-grid">
        <div class="detail-photo-stage">
          <img src="${esc(style.image)}" alt="${esc(style.name)}" />
        </div>
        <div>
          <span class="eyebrow-cyan">${esc(style.category)} • ★ ${Number(style.rating || 5).toFixed(1)}</span>
          <h3 style="font-size:1.5rem; margin-bottom:8px;">${esc(style.name)}</h3>
          <p style="font-size:13.5px; color:var(--ink-secondary);">${esc(style.description || '')}</p>

          ${
            style.pricingMode === 'flat'
              ? `<div class="flat-highlight-banner mt-14"><strong>Official Specialty Rate</strong><span>${formatPula(price)}</span></div>`
              : `
              <label class="micro-label mt-14">Select Braid Size</label>
              <div class="chip-row-5">
                ${SIZE_OPTIONS.map(
                  (s) => `<button type="button" class="choice-chip ${selSize === s.id ? 'active' : ''}" data-d-size="${s.id}">${esc(s.short)}</button>`
                ).join('')}
              </div>

              <label class="micro-label mt-12">Select Cascade Length</label>
              <div class="chip-row-3">
                ${LENGTH_OPTIONS.map(
                  (l) => `<button type="button" class="choice-chip ${selLen === l.id ? 'active' : ''}" data-d-len="${l.id}">${esc(l.label)}</button>`
                ).join('')}
              </div>
            `
          }

          <label class="micro-label mt-12">Preferred Braiding Shade (${esc(shadeObj.name)})</label>
          <div class="color-swatches-row">
            ${HAIR_COLORS.map(
              (c) => `
              <button type="button" class="shade-swatch-btn ${selColor === c.id ? 'active' : ''}" data-d-col="${c.id}">
                <span class="swatch-dot" style="background:${c.swatch}"></span>
                <span>${esc(c.code)}</span>
              </button>`
            ).join('')}
          </div>

          <div class="odometer-result-panel mt-16">
            <div>
              <span class="odometer-kicker">TAILORED BWP TOTAL</span>
              <div class="odometer-price" style="font-size:2rem;">${formatPula(price)}</div>
              <span class="odometer-meta">${esc(style.duration)} • 30% Deposit ${formatPula(deposit)}</span>
            </div>
            <button type="button" class="btn-couture-primary" id="detailConfirmBookBtn">
              Reserve Chair
            </button>
          </div>

          <div class="two-col-inputs mt-12">
            <button type="button" class="btn-couture-glass full-width sm" id="detailTryMirrorBtn">
              Preview in Style Mirror
            </button>
            <button type="button" class="btn-couture-glass full-width sm" id="detailAskChatBtn">
              Ask Nicole in Concierge
            </button>
          </div>
        </div>
      </div>
    `;

    host.querySelectorAll('[data-d-size]').forEach((b) => {
      b.addEventListener('click', () => {
        selSize = b.dataset.dSize;
        paint();
      });
    });
    host.querySelectorAll('[data-d-len]').forEach((b) => {
      b.addEventListener('click', () => {
        selLen = b.dataset.dLen;
        paint();
      });
    });
    host.querySelectorAll('[data-d-col]').forEach((b) => {
      b.addEventListener('click', () => {
        selColor = b.dataset.dCol;
        paint();
      });
    });

    document.getElementById('detailConfirmBookBtn')?.addEventListener('click', () => {
      ui.bookColorId = selColor;
      closeModal('styleDetailModal');
      jumpToBookingWithStyle(style.id, selSize, selLen);
    });

    document.getElementById('detailTryMirrorBtn')?.addEventListener('click', () => {
      ui.mirrorStyleId = style.id;
      ui.mirrorColorId = selColor;
      closeModal('styleDetailModal');
      openMirrorModal('selfie');
    });

    document.getElementById('detailAskChatBtn')?.addEventListener('click', () => {
      closeModal('styleDetailModal');
      sendStyleInquiryToChat(style, selSize, selLen, shadeObj);
    });
  };

  paint();
  openModal('styleDetailModal');
}

/* ================= VIRTUAL STYLE MIRROR & SMART MATCHER ================= */
function openMirrorModal(tab = 'selfie') {
  ui.mirrorTab = tab;
  renderMirrorModal();
  openModal('mirrorModal');
}

function renderMirrorModal() {
  const selfieBtn = document.getElementById('mirrorTabSelfieBtn');
  const quizBtn = document.getElementById('mirrorTabQuizBtn');
  const selfiePane = document.getElementById('mirrorSelfiePane');
  const quizPane = document.getElementById('mirrorQuizPane');

  const isSelfie = ui.mirrorTab === 'selfie';
  selfieBtn?.classList.toggle('active', isSelfie);
  quizBtn?.classList.toggle('active', !isSelfie);
  selfiePane?.classList.toggle('hidden', !isSelfie);
  quizPane?.classList.toggle('hidden', isSelfie);

  const style = store.state.styles.find((s) => s.id === ui.mirrorStyleId) || store.state.styles[0];
  const color = HAIR_COLORS.find((c) => c.id === ui.mirrorColorId) || HAIR_COLORS[0];
  const price = calculateStylePrice(style, style.defaultSize, style.defaultLength);

  const selfieImg = document.getElementById('mirrorSelfieImg');
  const styleImg = document.getElementById('mirrorStyleImg');
  const tint = document.getElementById('mirrorShadeTint');
  const priceTag = document.getElementById('mirrorStylePriceTag');
  const styleNameEl = document.getElementById('mirrorActiveStyleName');
  const shadeLbl = document.getElementById('mirrorActiveShadeLabel');

  if (selfieImg) selfieImg.src = ui.mirrorSelfieSrc;
  if (styleImg) styleImg.src = style.image;
  if (tint) tint.style.background = `radial-gradient(circle at 50% 30%, ${color.swatch}, transparent 75%)`;
  if (priceTag) priceTag.textContent = formatPula(price);
  if (styleNameEl) styleNameEl.textContent = style.name;
  if (shadeLbl) shadeLbl.textContent = `Shade Aura: ${color.code} ${color.name}`;

  const swatchesWrap = document.getElementById('mirrorShadeSwatches');
  if (swatchesWrap) {
    swatchesWrap.innerHTML = HAIR_COLORS.map(
      (c) => `
      <button type="button" class="shade-swatch-btn ${ui.mirrorColorId === c.id ? 'active' : ''}" data-m-col="${c.id}">
        <span class="swatch-dot" style="background:${c.swatch}"></span>
        <span>${esc(c.code)}</span>
      </button>`
    ).join('');
    swatchesWrap.querySelectorAll('[data-m-col]').forEach((b) => {
      b.addEventListener('click', () => {
        ui.mirrorColorId = b.dataset.mCol;
        renderMirrorModal();
      });
    });
  }

  const thumbsWrap = document.getElementById('mirrorStyleThumbs');
  if (thumbsWrap) {
    thumbsWrap.innerHTML = store.state.styles
      .map(
        (s) => `
      <button type="button" class="mirror-thumb-btn ${s.id === style.id ? 'active' : ''}" data-m-style="${esc(s.id)}" title="${esc(s.name)}">
        <img src="${esc(s.image)}" alt="${esc(s.name)}" loading="lazy" />
      </button>`
      )
      .join('');
    thumbsWrap.querySelectorAll('[data-m-style]').forEach((b) => {
      b.addEventListener('click', () => {
        ui.mirrorStyleId = b.dataset.mStyle;
        renderMirrorModal();
      });
    });
  }

  // Render Smart Matcher Quiz Results
  const budgetLbl = document.getElementById('quizBudgetVal');
  if (budgetLbl) budgetLbl.textContent = `Up to ${formatPula(ui.quizBudget)}`;

  document.querySelectorAll('#quizVibeChips [data-vibe]').forEach((b) => {
    b.classList.toggle('active', b.dataset.vibe === ui.quizVibe);
  });

  const quizGrid = document.getElementById('quizResultsGrid');
  if (quizGrid) {
    const scored = store.state.styles
      .map((s) => {
        const p = calculateStylePrice(s, s.defaultSize, s.defaultLength);
        let score = 84;
        if (p <= ui.quizBudget) score += 10;
        else score -= Math.min(25, Math.round((p - ui.quizBudget) / 8));
        if (ui.quizVibe === 'all' || s.vibe === ui.quizVibe) score += 5;
        return { style: s, score: Math.max(72, Math.min(99, score)), price: p };
      })
      .sort((a, b) => b.score - a.score || a.price - b.price)
      .slice(0, 3);

    quizGrid.innerHTML = scored.map((item) => buildStyleCardHtml(item.style, item.score)).join('');
    wireStyleCards(quizGrid);
  }
}

/* ================= BOOKING CONCIERGE & HOLOGRAPHIC VIP PASS ================= */
function jumpToBookingWithStyle(styleId, sizeId = 'medium', lengthId = 'midback') {
  ui.bookStyleId = styleId;
  ui.bookSize = sizeId || 'medium';
  ui.bookLength = lengthId || 'midback';
  switchTab('book');
  renderBookingView();
}

function getBookingTotals() {
  const style = store.state.styles.find((s) => s.id === ui.bookStyleId) || store.state.styles[0];
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

function renderBookingView() {
  const styles = store.state.styles;
  if (!styles.some((s) => s.id === ui.bookStyleId) && styles[0]) {
    ui.bookStyleId = styles[0].id;
  }
  const style = styles.find((s) => s.id === ui.bookStyleId) || styles[0];

  const selEl = document.getElementById('bookStyleSelect');
  if (selEl) {
    selEl.innerHTML = styles
      .map(
        (s) =>
          `<option value="${esc(s.id)}" ${s.id === ui.bookStyleId ? 'selected' : ''}>${esc(s.name)} — From ${formatPula(
            calculateStylePrice(s, s.defaultSize, s.defaultLength)
          )}</option>`
      )
      .join('');
  }

  const preview = document.getElementById('bookSelectedStylePreview');
  if (preview && style) {
    const curPrice = calculateStylePrice(style, ui.bookSize, ui.bookLength);
    preview.innerHTML = `
      <img src="${esc(style.image)}" alt="${esc(style.name)}" />
      <div style="flex:1">
        <strong style="display:block;font-size:14.5px;">${esc(style.name)}</strong>
        <span style="font-size:12px;color:var(--ink-secondary);">${esc(style.duration)} • ${esc(style.packs)}</span>
      </div>
      <strong style="font-size:18px;color:var(--cyan);">${formatPula(curPrice)}</strong>
    `;
  }

  const sizeWrap = document.getElementById('bookSizeChips');
  if (sizeWrap) {
    sizeWrap.innerHTML = SIZE_OPTIONS.map(
      (s) => `<button type="button" class="choice-chip ${ui.bookSize === s.id ? 'active' : ''}" data-bk-size="${s.id}">${esc(s.short)}</button>`
    ).join('');
    sizeWrap.querySelectorAll('[data-bk-size]').forEach((b) => {
      b.addEventListener('click', () => {
        ui.bookSize = b.dataset.bkSize;
        renderBookingView();
      });
    });
  }

  const lenWrap = document.getElementById('bookLengthChips');
  if (lenWrap) {
    lenWrap.innerHTML = LENGTH_OPTIONS.map(
      (l) => `<button type="button" class="choice-chip ${ui.bookLength === l.id ? 'active' : ''}" data-bk-len="${l.id}">${esc(l.label)}</button>`
    ).join('');
    lenWrap.querySelectorAll('[data-bk-len]').forEach((b) => {
      b.addEventListener('click', () => {
        ui.bookLength = b.dataset.bkLen;
        renderBookingView();
      });
    });
  }

  const colWrap = document.getElementById('bookColorSwatches');
  if (colWrap) {
    colWrap.innerHTML = HAIR_COLORS.map(
      (c) => `
      <button type="button" class="shade-swatch-btn ${ui.bookColorId === c.id ? 'active' : ''}" data-bk-col="${c.id}">
        <span class="swatch-dot" style="background:${c.swatch}"></span>
        <span>${esc(c.code)} ${esc(c.name.split(' ')[0])}</span>
      </button>`
    ).join('');
    colWrap.querySelectorAll('[data-bk-col]').forEach((b) => {
      b.addEventListener('click', () => {
        ui.bookColorId = b.dataset.bkCol;
        renderBookingView();
      });
    });
  }

  const chairGrid = document.getElementById('bookStylistGrid');
  if (chairGrid) {
    chairGrid.innerHTML = STYLISTS.map(
      (st) => `
      <button type="button" class="chair-option-card ${ui.bookStylistId === st.id ? 'active' : ''}" data-bk-chair="${st.id}">
        <span class="chair-tag">${esc(st.chair)}</span>
        <img src="${esc(st.avatar)}" alt="${esc(st.name)}" />
        <strong style="font-size:12.5px;">${esc(st.name)}</strong>
        <span style="font-size:10.5px;color:var(--ink-muted);">${esc(st.badge)}</span>
      </button>`
    ).join('');
    chairGrid.querySelectorAll('[data-bk-chair]').forEach((b) => {
      b.addEventListener('click', () => {
        ui.bookStylistId = b.dataset.bkChair;
        renderBookingView();
      });
    });
  }

  const dateRibbon = document.getElementById('bookDateScroller');
  if (dateRibbon) {
    const dates = getUpcomingDates(14);
    dateRibbon.innerHTML = dates
      .map(
        (d) => `
      <button type="button" class="date-pill-card ${ui.bookDate === d.iso ? 'active' : ''}" data-bk-date="${d.iso}">
        <span>${esc(d.dayName)}</span>
        <strong>${d.dayNum}</strong>
        <span>${esc(d.month)}</span>
      </button>`
      )
      .join('');
    dateRibbon.querySelectorAll('[data-bk-date]').forEach((b) => {
      b.addEventListener('click', () => {
        ui.bookDate = b.dataset.bkDate;
        renderBookingView();
      });
    });
  }

  const timeGrid = document.getElementById('bookTimeGrid');
  if (timeGrid) {
    timeGrid.innerHTML = TIME_SLOTS.map(
      (t) => `<button type="button" class="choice-chip ${ui.bookTime === t ? 'active' : ''}" data-bk-time="${t}">${t}</button>`
    ).join('');
    timeGrid.querySelectorAll('[data-bk-time]').forEach((b) => {
      b.addEventListener('click', () => {
        ui.bookTime = b.dataset.bkTime;
        renderBookingView();
      });
    });
  }

  const addonsWrap = document.getElementById('bookAddonsList');
  if (addonsWrap) {
    addonsWrap.innerHTML = ADD_ONS.map((a) => {
      const on = ui.bookAddOnIds.has(a.id);
      return `
        <div class="addon-row-item ${on ? 'active' : ''}" data-bk-addon="${a.id}">
          <div>
            <strong style="font-size:13px;">${esc(a.name)}</strong>
            <span style="font-size:11px;color:var(--cyan);margin-left:6px;">${esc(a.tag)}</span>
          </div>
          <strong style="color:var(--cyan);">+${formatPula(a.price)}</strong>
        </div>
      `;
    }).join('');
    addonsWrap.querySelectorAll('[data-bk-addon]').forEach((row) => {
      row.addEventListener('click', () => {
        const id = row.dataset.bkAddon;
        if (ui.bookAddOnIds.has(id)) ui.bookAddOnIds.delete(id);
        else ui.bookAddOnIds.add(id);
        renderBookingView();
      });
    });
  }

  const promoFeedback = document.getElementById('promoFeedbackText');
  if (promoFeedback) {
    promoFeedback.textContent = ui.appliedPromo
      ? `Active privilege: ${ui.appliedPromo.code} (${ui.appliedPromo.discountPercent}% OFF applied)`
      : '';
  }

  const { basePrice, addOnsTotal, discount, total, deposit } = getBookingTotals();
  const rowsEl = document.getElementById('bookingBreakdownRows');
  if (rowsEl) {
    rowsEl.innerHTML = `
      <div class="vault-row"><span>Hairstyle Rate</span><strong>${formatPula(basePrice)}</strong></div>
      ${addOnsTotal ? `<div class="vault-row"><span>Parlour Extras</span><strong>+${formatPula(addOnsTotal)}</strong></div>` : ''}
      ${discount ? `<div class="vault-row" style="color:var(--cyan);"><span>Campaign Privilege (${esc(ui.appliedPromo.code)})</span><strong>-${formatPula(discount)}</strong></div>` : ''}
      <div class="vault-row total"><span>Total Parlour Rate</span><strong>${formatPula(total)}</strong></div>
      <div class="vault-row"><span>30% Chair Deposit Today</span><strong>${formatPula(deposit)}</strong></div>
    `;
  }

  renderMyBookingsList();
}

function renderMyBookingsList() {
  const listEl = document.getElementById('myBookingsList');
  const countEl = document.getElementById('myBookingsCount');
  const bookings = store.state.bookings;
  if (countEl) countEl.textContent = String(bookings.length);
  if (!listEl) return;

  listEl.innerHTML = bookings
    .map(
      (b) => `
      <div class="mini-pass-card">
        <div class="mini-pass-top">
          <img src="${esc(b.styleImage || '/images/style-01-honey-curly-knotless.jpg')}" alt="${esc(b.styleName)}" />
          <div style="flex:1;min-width:0;">
            <span class="eyebrow-cyan">${esc(b.id)} • ${esc(b.status)}</span>
            <strong style="display:block;font-size:13.5px;">${esc(b.styleName)}</strong>
            <span style="font-size:11.5px;color:var(--ink-muted);">${esc(b.date)} at ${esc(b.time)} • ${formatPula(b.total)}</span>
          </div>
        </div>
        <div class="two-col-inputs">
          <button type="button" class="btn-couture-glass sm full-width" data-open-pass="${esc(b.id)}">Open VIP Pass</button>
          <a
            href="https://wa.me/${SALON_INFO.phoneIntl}?text=${encodeURIComponent(
              `Hi Nicole Beauty Parlour! Confirming my VIP Pass ${b.id} for ${b.styleName} on ${b.date} at ${b.time} (Total P${b.total}).`
            )}"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-couture-primary sm full-width"
          >
            WhatsApp Salon
          </a>
        </div>
      </div>
    `
    )
    .join('');

  listEl.querySelectorAll('[data-open-pass]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const bk = store.state.bookings.find((x) => x.id === btn.dataset.openPass);
      if (bk) openBookingPassModal(bk);
    });
  });
}

function buildDeterministicQrSvg(seedStr) {
  let hash = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const n = 11;
  let rects = '';
  const isFinder = (r, c) =>
    (r < 3 && c < 3) || (r < 3 && c >= n - 3) || (r >= n - 3 && c < 3);

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      let on = false;
      if (isFinder(r, c)) {
        on = true;
      } else {
        hash ^= (r * 31 + c * 17) & 0xff;
        hash = Math.imul(hash, 16777619);
        on = (hash >>> 3) % 2 === 0;
      }
      if (on) {
        rects += `<rect x="${c * 7 + 2}" y="${r * 7 + 2}" width="6" height="6" rx="1.2" fill="#050B16"/>`;
      }
    }
  }
  return `<svg viewBox="0 0 81 81" width="76" height="76" aria-label="VIP QR Code">${rects}</svg>`;
}

function downloadBookingIcs(bk) {
  const dtCompact = String(bk.date || '2026-12-01').replace(/-/g, '');
  const tmCompact = String(bk.time || '09:00').replace(':', '') + '00';
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nicole Beauty Parlour//VIP Pass//EN',
    'BEGIN:VEVENT',
    `UID:${bk.id}@nicolebeautyparlour.app`,
    `DTSTART:${dtCompact}T${tmCompact}`,
    `SUMMARY:Nicole Beauty Parlour — ${bk.styleName} (${bk.id})`,
    `LOCATION:${SALON_INFO.location} (${SALON_INFO.phoneDisplay})`,
    `DESCRIPTION:Stylist: ${bk.stylistName} | Total: P${bk.total} | 30% Deposit: P${bk.deposit}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${bk.id}-Nicole-Beauty-Parlour.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function openBookingPassModal(bk) {
  const host = document.getElementById('bookingPassContent');
  if (!host) return;

  const waUrl = `https://wa.me/${SALON_INFO.phoneIntl}?text=${encodeURIComponent(
    `Dumelang Nicole Beauty Parlour! Here is my Confirmed VIP Salon Pass ${bk.id}:\n• Style: ${bk.styleName} (${bk.sizeLabel || 'Medium'} • ${bk.lengthLabel || 'Midback'})\n• Shade: ${bk.hairColor || '#1B'}\n• Chair: ${bk.stylistName}\n• Date & Time: ${bk.date} at ${bk.time}\n• Total: P${bk.total} (30% Deposit P${bk.deposit} via ${bk.paymentMethod})`
  )}`;

  host.innerHTML = `
    <div class="modal-header-lux">
      <span class="eyebrow-cyan">CHAIR RESERVED • TILT CARD FOR HOLOGRAPHIC FOIL</span>
      <h3>Your VIP Salon Boarding Pass</h3>
    </div>

    <div class="holo-ticket-wrap">
      <div class="holo-ticket" id="interactiveHoloTicket">
        <div class="holo-ticket-crest">
          <img src="${SALON_INFO.logoLightInk}" alt="Nicole Beauty Parlour" />
          <span class="holo-pass-id">${esc(bk.id)}</span>
        </div>

        <div class="holo-ticket-body">
          <div>
            <strong style="font-size:17px;display:block;">${esc(bk.styleName)}</strong>
            <span style="color:#56ccf2;font-size:12px;font-weight:700;">${esc(bk.sizeLabel || 'Medium')} • ${esc(bk.lengthLabel || 'Midback')} • ${esc(bk.hairColor || '#1B')}</span>

            <div class="holo-kv-grid">
              <div><span>GUEST</span><strong>${esc(bk.clientName)}</strong></div>
              <div><span>BRAIDER</span><strong>${esc(bk.stylistName || 'Nicole')}</strong></div>
              <div><span>DATE &amp; TIME</span><strong>${esc(bk.date)} • ${esc(bk.time)}</strong></div>
              <div><span>TOTAL / DEPOSIT</span><strong>${formatPula(bk.total)} (${formatPula(bk.deposit)})</strong></div>
            </div>
          </div>

          <div class="holo-qr-box">
            ${buildDeterministicQrSvg(bk.id + bk.clientName)}
          </div>
        </div>

        <div style="padding-top:12px;border-top:1px dashed rgba(86,204,242,0.35);display:flex;justify-content:space-between;font-size:11px;color:#9cc2e3;">
          <span>${esc(SALON_INFO.location)}</span>
          <span>WhatsApp: ${esc(SALON_INFO.phoneDisplay)}</span>
        </div>
      </div>
    </div>

    <div class="two-col-inputs mt-16">
      <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-couture-primary full-width">
        Send Pass to Salon WhatsApp
      </a>
      <button type="button" class="btn-couture-glass full-width" id="savePassCalendarBtn">
        Add to Phone Calendar (.ics)
      </button>
    </div>
  `;

  const ticket = document.getElementById('interactiveHoloTicket');
  if (ticket) {
    ticket.addEventListener('pointermove', (e) => {
      const rect = ticket.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * 100;
      const py = ((e.clientY - rect.top) / rect.height) * 100;
      const rx = ((py - 50) / 50) * -6;
      const ry = ((px - 50) / 50) * 7;
      ticket.style.setProperty('--mx', `${px}%`);
      ticket.style.setProperty('--my', `${py}%`);
      ticket.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
    ticket.addEventListener('pointerleave', () => {
      ticket.style.transform = 'rotateX(0deg) rotateY(0deg)';
    });
  }

  document.getElementById('savePassCalendarBtn')?.addEventListener('click', () => {
    downloadBookingIcs(bk);
    showToast('Calendar invite downloaded!');
  });

  openModal('bookingPassModal');
}

/* ================= CONCIERGE MESSENGER ================= */
function sendStyleInquiryToChat(style, sizeId, lenId, shadeObj) {
  const price = calculateStylePrice(style, sizeId, lenId);
  ui.activeThreadId = 'thread-nicole';
  ui.mobileConvOpen = true;
  switchTab('messages');

  store.sendMessage({
    threadId: 'thread-nicole',
    sender: 'client',
    senderName: 'You',
    text: `Hi Nicole! I'd love to ask about "${style.name}" (${sizeId} • ${lenId}, shade ${shadeObj.code} — ${formatPula(price)}). Do you have an open chair soon?`,
    image: style.image,
    badge: `STYLE INQUIRY • ${formatPula(price)}`,
    styleName: style.name
  });

  triggerSmartAutoReply(style.name, style.name);
}

function triggerSmartAutoReply(userText, styleName = '') {
  const typing = document.getElementById('typingIndicator');
  typing?.classList.remove('hidden');
  scrollChatBottom();

  setTimeout(() => {
    typing?.classList.add('hidden');
    const reply = store.generateLocalSalonReply(userText, styleName);
    store.sendMessage({
      threadId: ui.activeThreadId,
      sender: 'salon',
      senderName: 'Nicole',
      text: reply
    });
    scrollChatBottom();
  }, 680);
}

function scrollChatBottom() {
  requestAnimationFrame(() => {
    const stream = document.getElementById('chatMessagesStream');
    if (stream) stream.scrollTop = stream.scrollHeight;
  });
}

function renderMessenger() {
  const layout = document.getElementById('chatLayout');
  const threadsWrap = document.getElementById('threadsList');
  const headEl = document.getElementById('activeThreadHeader');
  const streamEl = document.getElementById('chatMessagesStream');
  const unreadBadge = document.getElementById('navUnreadBadge');

  layout?.classList.toggle('conv-open', ui.mobileConvOpen);

  const totalUnread = store.state.threads.reduce((sum, t) => sum + (t.unread || 0), 0);
  if (unreadBadge) {
    unreadBadge.textContent = String(totalUnread);
    unreadBadge.classList.toggle('hidden', totalUnread === 0);
  }

  if (threadsWrap) {
    threadsWrap.innerHTML = store.state.threads
      .map((t) => {
        const last = t.messages[t.messages.length - 1];
        return `
          <button type="button" class="thread-item-btn ${t.id === ui.activeThreadId ? 'active' : ''}" data-thread-id="${esc(t.id)}">
            <img class="thread-avatar" src="${esc(t.avatar)}" alt="${esc(t.title)}" />
            <div style="flex:1;min-width:0;">
              <strong style="display:block;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(t.title)}</strong>
              <span style="display:block;font-size:11.5px;color:var(--ink-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(last?.text || t.subtitle)}</span>
            </div>
            ${t.unread ? `<span class="count-orb">${t.unread}</span>` : ''}
          </button>
        `;
      })
      .join('');

    threadsWrap.querySelectorAll('[data-thread-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        ui.activeThreadId = btn.dataset.threadId;
        ui.mobileConvOpen = true;
        store.markThreadRead(ui.activeThreadId);
        renderMessenger();
        scrollChatBottom();
      });
    });
  }

  const activeThread =
    store.state.threads.find((t) => t.id === ui.activeThreadId) || store.state.threads[0];

  if (headEl && activeThread) {
    headEl.innerHTML = `
      <strong>${esc(activeThread.title)}</strong>
      <span>${esc(activeThread.subtitle)}</span>
    `;
  }

  document.getElementById('modeClientBtn')?.classList.toggle('active', ui.senderMode === 'client');
  document.getElementById('modeSalonBtn')?.classList.toggle('active', ui.senderMode === 'salon');

  const input = document.getElementById('chatMessageInput');
  if (input) {
    input.placeholder =
      ui.senderMode === 'salon'
        ? 'Reply live as Nicole Beauty Parlour...'
        : 'Message Nicole Beauty Parlour...';
  }

  if (streamEl && activeThread) {
    streamEl.innerHTML = activeThread.messages
      .map(
        (m) => `
        <div class="msg-bubble-row ${m.sender === 'client' ? 'client' : 'salon'}">
          ${m.image ? `<img class="msg-media-img" src="${esc(m.image)}" alt="Attachment" />` : ''}
          <div class="msg-bubble">${esc(m.text)}</div>
          <span class="msg-meta-time">${esc(m.senderName || '')} • ${esc(m.timestamp || '')}</span>
        </div>
      `
      )
      .join('');
  }
}

/* ================= STUDIO & LIVE POSTER DESIGNER ================= */
function getDraftPromoFromForm() {
  const styleId = document.getElementById('promoStyleSelect')?.value || 'style-01';
  const style = store.state.styles.find((s) => s.id === styleId) || store.state.styles[0];
  return {
    title: document.getElementById('promoTitleInput')?.value || 'Festive Ice-Crown Special',
    subtitle:
      document.getElementById('promoSubtitleInput')?.value ||
      '20% OFF all Knotless & French Curl bookings!',
    discountPercent: Number(document.getElementById('promoDiscountInput')?.value || 20),
    code: String(document.getElementById('promoCodeInput')?.value || 'GLOW20').toUpperCase(),
    priceHighlight: document.getElementById('promoPriceHighlight')?.value || 'From P144',
    validUntil: document.getElementById('promoValidUntil')?.value || '2026-12-31',
    styleId,
    image: ui.newPromoCustomImage || style?.image || '/images/style-01-honey-curly-knotless.jpg',
    theme: document.getElementById('promoThemeSelect')?.value || 'obsidian-sapphire',
    badge: 'LIMITED PARLOUR OFFER'
  };
}

async function refreshLivePromoCanvas() {
  const canvas = document.getElementById('livePromoPreviewCanvas');
  if (!canvas) return;
  const draft = getDraftPromoFromForm();
  await renderPromoFlyerToCanvas(canvas, draft);
}

async function openFlyerPreviewModal(promo) {
  ui.lastFlyerPromo = promo;
  const blob = await renderPromoFlyerBlob(promo);
  ui.lastFlyerBlob = blob;
  const img = document.getElementById('flyerPreviewImage');
  if (img && blob) {
    img.src = URL.createObjectURL(blob);
  }
  openModal('flyerModal');
}

function requireAdminAuth(callback) {
  if (store.isAdmin()) {
    if (typeof callback === 'function') callback();
    return true;
  }
  ui.pendingAdminCallback = typeof callback === 'function' ? callback : null;
  switchTab('studio');
  showToast('Sign in with your Admin number & password first');
  setTimeout(() => {
    document.getElementById('adminPhoneInput')?.focus();
  }, 120);
  return false;
}

function switchAdminPane(paneId) {
  ui.adminPane = paneId;
  document.querySelectorAll('.admin-subtab[data-admin-pane]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.adminPane === paneId);
  });
  document.querySelectorAll('.admin-pane').forEach((pane) => {
    pane.classList.toggle('hidden', pane.id !== `admin-pane-${paneId}`);
  });
}

function openEditStyleModal(styleId) {
  const s = store.state.styles.find((item) => item.id === styleId);
  if (!s) return;
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };
  setVal('editStyleIdInput', s.id);
  setVal('editStyleNameInput', s.name || '');
  setVal('editStyleCategorySelect', s.category || 'Knotless Braids');
  setVal('editStyleBadgeInput', s.badge || '');
  setVal('editStylePricingMode', s.pricingMode || 'matrix');
  setVal(
    'editStyleFlatPriceInput',
    s.pricingMode === 'flat' ? Number(s.flatPrice || 250) : Number(s.priceOffset || 0)
  );
  setVal('editStyleDurationInput', s.duration || '4 – 5 hrs');
  setVal('editStylePacksInput', s.packs || '5–6 packs');
  setVal('editStyleDescInput', s.description || '');
  const featEl = document.getElementById('editStyleFeaturedCheck');
  if (featEl) featEl.checked = Boolean(s.featured);
  openModal('editStyleModal');
}

function openWalkInBookingModal() {
  const styleSel = document.getElementById('walkInStyleSelect');
  if (styleSel) {
    styleSel.innerHTML = store.state.styles
      .map(
        (s) =>
          `<option value="${esc(s.id)}">${esc(s.name)} (${formatPula(
            calculateStylePrice(s, s.defaultSize, s.defaultLength)
          )})</option>`
      )
      .join('');
  }
  const chairSel = document.getElementById('walkInStylistSelect');
  if (chairSel) {
    chairSel.innerHTML = STYLISTS.map(
      (st) => `<option value="${esc(st.id)}">${esc(st.chair)} • ${esc(st.name)}</option>`
    ).join('');
  }
  const dateInp = document.getElementById('walkInDateInput');
  if (dateInp && !dateInp.value) {
    dateInp.value = new Date().toISOString().slice(0, 10);
  }
  const firstStyle = store.state.styles[0];
  const priceInp = document.getElementById('walkInPriceInput');
  if (priceInp && firstStyle) {
    priceInp.value = String(calculateStylePrice(firstStyle, firstStyle.defaultSize, firstStyle.defaultLength));
  }
  openModal('walkInModal');
}

function syncAdminUiState() {
  const unlocked = store.isAdmin();
  const gate = document.getElementById('adminLoginGate');
  const suite = document.getElementById('adminUnlockedSuite');
  if (gate) gate.classList.toggle('hidden', unlocked);
  if (suite) suite.classList.toggle('hidden', !unlocked);

  // Toggle admin-only controls in public client tabs
  document.querySelectorAll('.admin-only-el').forEach((el) => {
    el.classList.toggle('hidden', !unlocked);
  });

  if (!unlocked && ui.senderMode === 'salon') {
    ui.senderMode = 'client';
  }

  // Topbar & Dock status badges
  const topBtn = document.getElementById('topbarAdminBtn');
  const topLbl = document.getElementById('topbarAdminLabel');
  const topDot = document.getElementById('topbarAdminLiveDot');
  const dockDot = document.getElementById('adminDockBadge');
  const tileTitle = document.getElementById('quickAdminTileTitle');
  const tileSub = document.getElementById('quickAdminTileSub');

  if (topBtn) topBtn.classList.toggle('unlocked', unlocked);
  if (topLbl) topLbl.textContent = unlocked ? 'Admin Live' : 'Admin';
  if (topDot) topDot.classList.toggle('hidden', !unlocked);
  if (dockDot) dockDot.classList.toggle('unlocked', unlocked);
  if (tileTitle) tileTitle.textContent = unlocked ? 'Executive Suite' : 'Admin Panel';
  if (tileSub) tileSub.textContent = unlocked ? 'Unlocked • Manage Salon' : 'Phone + Password Login';

  if (unlocked && store.adminSession?.admin) {
    const adm = store.adminSession.admin;
    const idBadge = document.getElementById('adminIdentityBadge');
    if (idBadge) {
      idBadge.textContent = `${adm.name || 'Nicole • Parlour Owner'} (${adm.displayPhone || `+267 ${adm.phone}`})`;
    }
    const nameInp = document.getElementById('credOwnerNameInput');
    const phoneInp = document.getElementById('credNewPhoneInput');
    if (nameInp && !nameInp.value) nameInp.value = adm.name || 'Nicole • Parlour Owner';
    if (phoneInp && !phoneInp.value) phoneInp.value = adm.phone || '72517904';
  }
}

function getStatusPillClass(status = '') {
  const s = status.toLowerCase();
  if (s.includes('chair')) return 'inchair';
  if (s.includes('complete')) return 'completed';
  if (s.includes('cancel')) return 'cancelled';
  return 'confirmed';
}

function renderStudioView() {
  syncAdminUiState();
  if (!store.isAdmin()) return;

  switchAdminPane(ui.adminPane);

  const kpiEl = document.getElementById('studioStatsGrid');
  const promosList = document.getElementById('studioPromosList');
  const stylesList = document.getElementById('studioStylesList');
  const bookingsList = document.getElementById('studioBookingsList');
  const chairAnalyticsEl = document.getElementById('adminChairAnalytics');
  const recentBookingsEl = document.getElementById('adminRecentBookingsPreview');
  const inboxSummaryEl = document.getElementById('adminInboxSummary');

  const styles = store.state.styles;
  const promos = store.state.promotions;
  const bookings = store.state.bookings;
  const activeBookings = bookings.filter((b) => b.status !== 'Cancelled');
  const totalValue = activeBookings.reduce((sum, b) => sum + Number(b.total || 0), 0);
  const totalDeposits = activeBookings.reduce((sum, b) => sum + Number(b.deposit || Math.round((b.total || 0) * 0.3)), 0);

  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(val);
  };
  setTxt('adminTabBookingsCount', bookings.length);
  setTxt('adminTabStylesCount', styles.length);
  setTxt('adminTabPromosCount', promos.length);

  if (kpiEl) {
    kpiEl.innerHTML = `
      <div class="kpi-glass-box"><span>Booked Volume</span><strong>${formatPula(totalValue)}</strong></div>
      <div class="kpi-glass-box"><span>30% Chair Deposits</span><strong>${formatPula(totalDeposits)}</strong></div>
      <div class="kpi-glass-box"><span>VIP Reservations</span><strong>${bookings.length}</strong></div>
      <div class="kpi-glass-box"><span>Styles / Live Promos</span><strong>${styles.length} / ${promos.filter((p) => p.active).length}</strong></div>
    `;
  }

  // Chair Performance Breakdown
  if (chairAnalyticsEl) {
    const maxChairRev = Math.max(
      500,
      ...STYLISTS.map((st) =>
        activeBookings
          .filter((b) => b.stylistId === st.id || (b.stylistName && b.stylistName.includes(st.name.split(' ')[0])))
          .reduce((s, b) => s + Number(b.total || 0), 0)
      )
    );

    chairAnalyticsEl.innerHTML = STYLISTS.map((st) => {
      const chairBookings = activeBookings.filter(
        (b) => b.stylistId === st.id || (b.stylistName && b.stylistName.includes(st.name.split(' ')[0]))
      );
      const rev = chairBookings.reduce((s, b) => s + Number(b.total || 0), 0);
      const pct = Math.max(12, Math.min(100, Math.round((rev / maxChairRev) * 100)));
      return `
        <div class="chair-metric-card">
          <div class="chair-metric-top">
            <strong>${esc(st.chair)} • ${esc(st.name)}</strong>
            <span>${formatPula(rev)}</span>
          </div>
          <div class="chair-bar-track">
            <div class="chair-bar-fill" style="width:${pct}%"></div>
          </div>
          <div class="chair-metric-sub">
            <span>${esc(st.specialty)}</span>
            <span>${chairBookings.length} appointment${chairBookings.length === 1 ? '' : 's'}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // Recent Bookings Preview on Overview
  if (recentBookingsEl) {
    recentBookingsEl.innerHTML = bookings.slice(0, 4).map((bk) => `
      <div class="studio-row-card">
        <img src="${esc(bk.styleImage || '/images/style-01-honey-curly-knotless.jpg')}" alt="${esc(bk.styleName)}" />
        <div class="studio-row-info">
          <strong>${esc(bk.clientName)} • ${esc(bk.id)}</strong>
          <span>${esc(bk.styleName)} • ${esc(bk.date)} ${esc(bk.time)} • ${formatPula(bk.total)}</span>
        </div>
        <span class="status-pill-tag ${getStatusPillClass(bk.status)}">${esc(bk.status)}</span>
      </div>
    `).join('');
  }

  // Promo style select inside Add Promo modal
  const promoSel = document.getElementById('promoStyleSelect');
  if (promoSel) {
    promoSel.innerHTML = styles
      .map((s) => `<option value="${esc(s.id)}">${esc(s.name)}</option>`)
      .join('');
  }

  // Campaigns & Posters Pane
  if (promosList) {
    promosList.innerHTML = promos
      .map(
        (p) => `
      <div class="studio-row-card">
        <img src="${esc(p.image)}" alt="${esc(p.title)}" />
        <div class="studio-row-info">
          <strong>${esc(p.title)}</strong>
          <span>Code: <strong>${esc(p.code)}</strong> • ${p.discountPercent}% OFF • Valid until ${esc(p.validUntil || 'Ongoing')} • ${p.active ? 'LIVE' : 'Paused'}</span>
        </div>
        <div class="studio-row-actions">
          <button type="button" class="mini-action-chip" data-st-flyer="${esc(p.id)}">HD Poster</button>
          <button type="button" class="mini-action-chip" data-st-toggle-promo="${esc(p.id)}">${p.active ? 'Pause' : 'Resume'}</button>
          <button type="button" class="mini-action-chip danger" data-st-del-promo="${esc(p.id)}">Delete</button>
        </div>
      </div>`
      )
      .join('');

    promosList.querySelectorAll('[data-st-flyer]').forEach((b) => {
      b.addEventListener('click', () => {
        const pr = promos.find((x) => x.id === b.dataset.stFlyer);
        if (pr) openFlyerPreviewModal(pr);
      });
    });
    promosList.querySelectorAll('[data-st-toggle-promo]').forEach((b) => {
      b.addEventListener('click', async () => {
        await store.togglePromotion(b.dataset.stTogglePromo);
        showToast('Campaign status updated');
      });
    });
    promosList.querySelectorAll('[data-st-del-promo]').forEach((b) => {
      b.addEventListener('click', async () => {
        await store.deletePromotion(b.dataset.stDelPromo);
        showToast('Campaign removed');
      });
    });
  }

  // Catalog & Prices Pane
  if (stylesList) {
    const q = ui.adminStyleQuery.trim().toLowerCase();
    const filteredStyles = styles.filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q) ||
        (s.badge || '').toLowerCase().includes(q)
    );

    stylesList.innerHTML = filteredStyles
      .map(
        (s) => `
      <div class="studio-row-card">
        <img src="${esc(s.image)}" alt="${esc(s.name)}" />
        <div class="studio-row-info">
          <strong>${esc(s.name)} ${s.featured ? '★' : ''}</strong>
          <span>${esc(s.category)} • ${s.pricingMode === 'flat' ? `Flat ${formatPula(s.flatPrice || 250)}` : `From ${formatPula(calculateStylePrice(s, s.defaultSize, s.defaultLength))}`} • ${esc(s.duration)}</span>
        </div>
        <div class="studio-row-actions">
          <button type="button" class="mini-action-chip" data-st-feat-style="${esc(s.id)}" title="Toggle 3D Runway Spotlight">${s.featured ? 'Runway ★' : '+ Runway'}</button>
          <button type="button" class="mini-action-chip" data-st-edit-style="${esc(s.id)}">Edit / Price</button>
          <button type="button" class="mini-action-chip danger" data-st-del-style="${esc(s.id)}">Delete</button>
        </div>
      </div>`
      )
      .join('');

    stylesList.querySelectorAll('[data-st-feat-style]').forEach((b) => {
      b.addEventListener('click', async () => {
        const target = styles.find((x) => x.id === b.dataset.stFeatStyle);
        if (!target) return;
        await store.updateStyle(target.id, { featured: !target.featured });
        showToast(target.featured ? 'Added to 3D Runway!' : 'Removed from 3D Runway');
      });
    });
    stylesList.querySelectorAll('[data-st-edit-style]').forEach((b) => {
      b.addEventListener('click', () => openEditStyleModal(b.dataset.stEditStyle));
    });
    stylesList.querySelectorAll('[data-st-del-style]').forEach((b) => {
      b.addEventListener('click', async () => {
        if (styles.length <= 2) {
          showToast('Keep at least 2 hairstyles in catalog');
          return;
        }
        await store.deleteStyle(b.dataset.stDelStyle);
        showToast('Hairstyle removed from catalog');
      });
    });
  }

  // Reservations & Walk-Ins Pane
  if (bookingsList) {
    const bq = ui.adminBookingQuery.trim().toLowerCase();
    const filteredBookings = bookings.filter((bk) => {
      if (ui.adminBookingStatus !== 'All' && bk.status !== ui.adminBookingStatus) return false;
      if (!bq) return true;
      return (
        (bk.clientName || '').toLowerCase().includes(bq) ||
        (bk.clientPhone || '').toLowerCase().includes(bq) ||
        (bk.id || '').toLowerCase().includes(bq) ||
        (bk.styleName || '').toLowerCase().includes(bq)
      );
    });

    bookingsList.innerHTML = filteredBookings.length
      ? filteredBookings
          .map((bk) => {
            const cleanWa = String(bk.clientPhone || SALON_INFO.phoneRaw).replace(/\D/g, '');
            const waDest = cleanWa.length === 8 ? `267${cleanWa}` : cleanWa || SALON_INFO.phoneIntl;
            return `
          <div class="studio-row-card">
            <img src="${esc(bk.styleImage || '/images/style-01-honey-curly-knotless.jpg')}" alt="${esc(bk.styleName)}" />
            <div class="studio-row-info">
              <strong>${esc(bk.clientName)} (${esc(bk.clientPhone || 'Walk-in')}) • <span style="color:var(--cyan)">${esc(bk.id)}</span></strong>
              <span>${esc(bk.styleName)} • ${esc(bk.date)} at ${esc(bk.time)} • ${esc(bk.stylistName)} • <strong>${formatPula(bk.total)}</strong> (Dep: ${formatPula(bk.deposit || Math.round((bk.total || 0) * 0.3))})</span>
            </div>
            <div class="studio-row-actions">
              <select class="glass-select" data-st-status-sel="${esc(bk.id)}" aria-label="Booking status">
                ${['Confirmed', 'In Chair', 'Completed', 'Cancelled']
                  .map((st) => `<option value="${st}" ${bk.status === st ? 'selected' : ''}>${st}</option>`)
                  .join('')}
              </select>
              <button type="button" class="mini-action-chip" data-st-pass="${esc(bk.id)}">VIP Pass</button>
              <a href="https://wa.me/${waDest}?text=${encodeURIComponent(`Dumelang ${bk.clientName}! Nicole Beauty Parlour here regarding your appointment ${bk.id} (${bk.styleName} on ${bk.date} at ${bk.time}).`)}" target="_blank" rel="noopener noreferrer" class="mini-action-chip">WhatsApp</a>
            </div>
          </div>`;
          })
          .join('')
      : `<p class="admin-helper-copy">No reservations match the current filter.</p>`;

    bookingsList.querySelectorAll('[data-st-status-sel]').forEach((sel) => {
      sel.addEventListener('change', async (e) => {
        const newStatus = e.target.value;
        await store.updateBookingStatus(sel.dataset.stStatusSel, { status: newStatus });
        showToast(`Booking ${sel.dataset.stStatusSel} → ${newStatus}`);
      });
    });
    bookingsList.querySelectorAll('[data-st-pass]').forEach((b) => {
      b.addEventListener('click', () => {
        const bk = bookings.find((x) => x.id === b.dataset.stPass);
        if (bk) openBookingPassModal(bk);
      });
    });
  }

  // Inbox Summary inside Security & Inbox Pane
  if (inboxSummaryEl) {
    inboxSummaryEl.innerHTML = store.state.threads
      .map((t) => {
        const last = t.messages[t.messages.length - 1];
        return `
        <div class="inbox-mini-row">
          <div>
            <strong>${esc(t.name)}</strong>
            <span>${esc((last?.text || 'No messages yet').slice(0, 68))}</span>
          </div>
          <span class="status-pill-tag confirmed">${t.messages.length} msgs</span>
        </div>`;
      })
      .join('');
  }
}

/* ================= NOTIFICATIONS ================= */
function renderNotifications() {
  const badge = document.getElementById('notifBadge');
  const list = document.getElementById('notificationsList');
  const unread = store.state.notifications.filter((n) => n.unread).length;

  if (badge) {
    badge.textContent = String(unread);
    badge.classList.toggle('hidden', unread === 0);
  }
  if (list) {
    list.innerHTML = store.state.notifications
      .map(
        (n) => `
      <div class="notif-item-card">
        <strong>${esc(n.title)}</strong>
        <p>${esc(n.body)}</p>
      </div>`
      )
      .join('');
  }
}

function renderAll() {
  renderStoriesBar();
  renderCoverflow();
  renderArchitect();
  renderCampaigns();
  renderFeaturedAndBraiders();
  renderGalleryView();
  renderBookingView();
  renderMessenger();
  renderStudioView();
  renderNotifications();
}

/* ================= EVENT BINDINGS ================= */
function bindEvents() {
  // Theme Toggle
  document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
    applyTheme(ui.theme === 'dark' ? 'light' : 'dark');
    showToast(ui.theme === 'light' ? 'Ice-Pearl Day Mode' : 'Obsidian Velvet Runway Mode');
  });

  // Brand home
  document.getElementById('brandHomeBtn')?.addEventListener('click', () => switchTab('discover'));

  // Bottom dock & goto-tab triggers
  document.querySelectorAll('.dock-item[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  document.querySelectorAll('[data-goto-tab]').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.gotoTab));
  });

  // Close modal buttons & backdrop click
  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
  });
  document.querySelectorAll('.modal-backdrop').forEach((bd) => {
    bd.addEventListener('click', (e) => {
      if (e.target === bd) closeModal(bd.id);
    });
  });

  // Coverflow arrows & touch swipe
  document.getElementById('cfPrevBtn')?.addEventListener('click', () => {
    ui.coverflowIndex--;
    renderCoverflow();
  });
  document.getElementById('cfNextBtn')?.addEventListener('click', () => {
    ui.coverflowIndex++;
    renderCoverflow();
  });

  const cfStage = document.getElementById('coverflowStage');
  let touchStartX = 0;
  cfStage?.addEventListener(
    'touchstart',
    (e) => {
      touchStartX = e.changedTouches[0]?.clientX || 0;
    },
    { passive: true }
  );
  cfStage?.addEventListener(
    'touchend',
    (e) => {
      const dx = (e.changedTouches[0]?.clientX || 0) - touchStartX;
      if (Math.abs(dx) > 36) {
        ui.coverflowIndex += dx < 0 ? 1 : -1;
        renderCoverflow();
      }
    },
    { passive: true }
  );

  // Hero & Topbar triggers
  document.getElementById('heroReserveBtn')?.addEventListener('click', () => switchTab('book'));
  document.getElementById('openMirrorModalBtn')?.addEventListener('click', () => openMirrorModal('selfie'));
  document.getElementById('heroOpenMirrorBtn')?.addEventListener('click', () => openMirrorModal('selfie'));
  document.getElementById('quickMirrorTileBtn')?.addEventListener('click', () => openMirrorModal('selfie'));
  document.getElementById('marketMirrorBtn')?.addEventListener('click', () => openMirrorModal('quiz'));

  document.getElementById('openPriceSheetBtn')?.addEventListener('click', () => openModal('priceSheetModal'));
  document.getElementById('quickPriceTileBtn')?.addEventListener('click', () => openModal('priceSheetModal'));
  document.getElementById('viewPosterInlineBtn')?.addEventListener('click', () => openModal('priceSheetModal'));
  document.getElementById('marketPriceCardLink')?.addEventListener('click', () => openModal('priceSheetModal'));
  document.getElementById('bookFromPriceModalBtn')?.addEventListener('click', () => {
    closeModal('priceSheetModal');
    switchTab('book');
  });

  // Topbar & Runway Admin Panel triggers
  document.getElementById('topbarAdminBtn')?.addEventListener('click', () => switchTab('studio'));
  document.getElementById('quickAdminTileBtn')?.addEventListener('click', () => switchTab('studio'));

  // ================= ADMIN PHONE + PASSWORD LOGIN GATE EVENTS =================
  document.getElementById('toggleAdminPassBtn')?.addEventListener('click', () => {
    const inp = document.getElementById('adminPasswordInput');
    const openIcon = document.getElementById('eyeOpenIcon');
    const closedIcon = document.getElementById('eyeClosedIcon');
    if (!inp) return;
    const reveal = inp.type === 'password';
    inp.type = reveal ? 'text' : 'password';
    openIcon?.classList.toggle('hidden', reveal);
    closedIcon?.classList.toggle('hidden', !reveal);
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
    showToast('Starter credentials filled — tap Sign In!');
  });

  document.getElementById('adminLoginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = document.getElementById('adminPhoneInput')?.value.trim() || '';
    const password = document.getElementById('adminPasswordInput')?.value || '';
    const remember = Boolean(document.getElementById('adminRememberCheckbox')?.checked);
    const errEl = document.getElementById('adminLoginError');
    const submitBtn = document.getElementById('adminLoginSubmitBtn');
    const card = document.getElementById('adminVaultCard');

    if (errEl) errEl.classList.add('hidden');
    if (submitBtn) submitBtn.disabled = true;

    const result = await store.loginAdmin({ phone, password, remember });
    if (submitBtn) submitBtn.disabled = false;

    if (!result.ok) {
      if (errEl) {
        errEl.textContent = result.error || 'Incorrect phone number or password.';
        errEl.classList.remove('hidden');
      }
      if (card) {
        card.classList.remove('shake');
        void card.offsetWidth;
        card.classList.add('shake');
      }
      return;
    }

    const pwInput = document.getElementById('adminPasswordInput');
    if (pwInput) pwInput.value = '';
    launchIceConfetti();
    showToast(`Welcome back, ${result.admin?.name || 'Nicole'}!`);
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
    showToast('Admin Panel locked');
    renderAll();
  });

  // Admin Sub-navigation & Filters
  document.querySelectorAll('.admin-subtab[data-admin-pane]').forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.adminPane = btn.dataset.adminPane;
      renderStudioView();
    });
  });
  document.querySelectorAll('[data-goto-admin-pane]').forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.adminPane = btn.dataset.gotoAdminPane;
      renderStudioView();
    });
  });

  document.getElementById('adminBookingSearchInput')?.addEventListener('input', (e) => {
    ui.adminBookingQuery = e.target.value;
    renderStudioView();
  });
  document.getElementById('adminBookingStatusFilter')?.addEventListener('change', (e) => {
    ui.adminBookingStatus = e.target.value;
    renderStudioView();
  });
  document.getElementById('adminStyleSearchInput')?.addEventListener('input', (e) => {
    ui.adminStyleQuery = e.target.value;
    renderStudioView();
  });

  // Admin Edit Hairstyle Form
  document.getElementById('editStyleForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!requireAdminAuth()) return;
    const styleId = document.getElementById('editStyleIdInput')?.value;
    if (!styleId) return;
    const pricingMode = document.getElementById('editStylePricingMode')?.value || 'matrix';
    const numVal = Number(document.getElementById('editStyleFlatPriceInput')?.value || 0);
    const patch = {
      name: document.getElementById('editStyleNameInput')?.value.trim(),
      category: document.getElementById('editStyleCategorySelect')?.value,
      badge: document.getElementById('editStyleBadgeInput')?.value.trim(),
      pricingMode,
      flatPrice: pricingMode === 'flat' ? Math.max(50, numVal || 250) : undefined,
      priceOffset: pricingMode === 'matrix' ? numVal : 0,
      duration: document.getElementById('editStyleDurationInput')?.value.trim(),
      packs: document.getElementById('editStylePacksInput')?.value.trim(),
      description: document.getElementById('editStyleDescInput')?.value.trim(),
      featured: Boolean(document.getElementById('editStyleFeaturedCheck')?.checked)
    };
    await store.updateStyle(styleId, patch);
    closeModal('editStyleModal');
    showToast(`Updated "${patch.name}"!`);
  });

  // Admin Walk-In Booking Modal
  document.getElementById('adminOpenWalkInBtn')?.addEventListener('click', () =>
    requireAdminAuth(openWalkInBookingModal)
  );
  document.getElementById('adminWalkInInlineBtn')?.addEventListener('click', () =>
    requireAdminAuth(openWalkInBookingModal)
  );
  document.getElementById('walkInStyleSelect')?.addEventListener('change', (e) => {
    const st = store.state.styles.find((x) => x.id === e.target.value);
    const prInp = document.getElementById('walkInPriceInput');
    if (st && prInp) {
      prInp.value = String(calculateStylePrice(st, st.defaultSize, st.defaultLength));
    }
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

    const style = store.state.styles.find((s) => s.id === styleId) || store.state.styles[0];
    const stylist = STYLISTS.find((s) => s.id === stylistId) || STYLISTS[0];

    const bk = await store.createBooking({
      clientName,
      clientPhone,
      styleId: style.id,
      styleName: style.name,
      styleImage: style.image,
      size: style.defaultSize || 'medium',
      sizeLabel: 'Parlour Desk',
      length: style.defaultLength || 'midback',
      lengthLabel: 'Standard',
      hairColor: '#1B Natural Jet Black',
      stylistId: stylist.id,
      stylistName: stylist.name,
      date,
      time,
      addOns: [],
      subtotal: total,
      discount: 0,
      total,
      deposit: Math.round(total * 0.3),
      status,
      paymentMethod: 'Admin Walk-In / Parlour Desk'
    });
    closeModal('walkInModal');
    e.target.reset();
    ui.adminPane = 'bookings';
    renderStudioView();
    showToast(`Walk-In Pass ${bk.id} created!`);
  });

  // Admin Jump to Live Concierge as Nicole Desk
  document.getElementById('adminJumpToSalonChatBtn')?.addEventListener('click', () => {
    if (!requireAdminAuth()) return;
    ui.senderMode = 'salon';
    ui.activeThreadId = 'thread-nicole';
    switchTab('messages');
    renderMessenger();
    showToast('Switched to Nicole Salon Desk mode');
  });

  // Admin Security Credentials Form (Update Phone Number & Password)
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
        msgEl.textContent = res.error || 'Failed to update credentials.';
      }
      return;
    }

    if (msgEl) {
      msgEl.style.color = '#4ade80';
      msgEl.textContent = `Saved! Active Admin Login Number: ${res.admin.phone}`;
    }
    const curInp = document.getElementById('credCurrentPasswordInput');
    const newInp = document.getElementById('credNewPasswordInput');
    if (curInp) curInp.value = '';
    if (newInp) newInp.value = '';
    showToast('Admin login number & password updated!');
    renderAll();
  });

  document.getElementById('openNotificationsBtn')?.addEventListener('click', () => {
    store.markNotificationsRead();
    openModal('notificationsModal');
  });
  document.getElementById('openInstallModalBtn')?.addEventListener('click', () => openModal('installModal'));

  // Story prev/next
  document.getElementById('storyPrevBtn')?.addEventListener('click', () => openStoryAt(ui.storyIndex - 1));
  document.getElementById('storyNextBtn')?.addEventListener('click', () => openStoryAt(ui.storyIndex + 1));

  // Virtual Mirror events
  document.getElementById('mirrorTabSelfieBtn')?.addEventListener('click', () => {
    ui.mirrorTab = 'selfie';
    renderMirrorModal();
  });
  document.getElementById('mirrorTabQuizBtn')?.addEventListener('click', () => {
    ui.mirrorTab = 'quiz';
    renderMirrorModal();
  });
  document.getElementById('mirrorSelfieInput')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    ui.mirrorSelfieSrc = await compressImageFile(file, 720, 0.85);
    renderMirrorModal();
    showToast('Selfie loaded into Style Mirror!');
  });
  document.getElementById('mirrorBookLookBtn')?.addEventListener('click', () => {
    const st = store.state.styles.find((s) => s.id === ui.mirrorStyleId) || store.state.styles[0];
    ui.bookColorId = ui.mirrorColorId;
    closeModal('mirrorModal');
    jumpToBookingWithStyle(st.id, st.defaultSize, st.defaultLength);
  });
  document.getElementById('mirrorSendToChatBtn')?.addEventListener('click', () => {
    const st = store.state.styles.find((s) => s.id === ui.mirrorStyleId) || store.state.styles[0];
    const col = HAIR_COLORS.find((c) => c.id === ui.mirrorColorId) || HAIR_COLORS[0];
    closeModal('mirrorModal');
    sendStyleInquiryToChat(st, st.defaultSize, st.defaultLength, col);
  });

  document.getElementById('quizBudgetRange')?.addEventListener('input', (e) => {
    ui.quizBudget = Number(e.target.value);
    renderMirrorModal();
  });
  document.querySelectorAll('#quizVibeChips [data-vibe]').forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.quizVibe = btn.dataset.vibe;
      renderMirrorModal();
    });
  });

  // Architect calculator events
  document.getElementById('calcModeMatrixBtn')?.addEventListener('click', () => {
    ui.calcMode = 'matrix';
    renderArchitect();
  });
  document.getElementById('calcModeFlatBtn')?.addEventListener('click', () => {
    ui.calcMode = 'flat';
    renderArchitect();
  });
  document.getElementById('calcBookNowBtn')?.addEventListener('click', () => {
    const targetId = ui.calcMode === 'flat' ? 'style-13' : 'style-01';
    jumpToBookingWithStyle(targetId, ui.calcSize, ui.calcLength);
  });

  // Gallery search & filters
  document.getElementById('marketSearchInput')?.addEventListener('input', (e) => {
    ui.searchQuery = e.target.value;
    renderGalleryView();
  });
  document.getElementById('clearSearchBtn')?.addEventListener('click', () => {
    ui.searchQuery = '';
    const inp = document.getElementById('marketSearchInput');
    if (inp) inp.value = '';
    renderGalleryView();
  });
  document.getElementById('savedFilterBtn')?.addEventListener('click', () => {
    ui.savedOnly = !ui.savedOnly;
    renderGalleryView();
  });
  document.getElementById('marketSortSelect')?.addEventListener('change', (e) => {
    ui.sortBy = e.target.value;
    renderGalleryView();
  });

  // Booking form events
  document.getElementById('bookStyleSelect')?.addEventListener('change', (e) => {
    ui.bookStyleId = e.target.value;
    const st = store.state.styles.find((s) => s.id === ui.bookStyleId);
    if (st) {
      ui.bookSize = st.defaultSize || 'medium';
      ui.bookLength = st.defaultLength || 'midback';
    }
    renderBookingView();
  });

  document.getElementById('applyPromoBtn')?.addEventListener('click', () => {
    const raw = String(document.getElementById('bookPromoInput')?.value || '')
      .trim()
      .toUpperCase();
    const match = store.state.promotions.find((p) => p.active && p.code.toUpperCase() === raw);
    if (!match) {
      ui.appliedPromo = null;
      showToast('Code not found — try SLAY15 or CROWN250');
    } else {
      ui.appliedPromo = match;
      showToast(`Code ${match.code} applied (${match.discountPercent}% OFF)!`);
    }
    renderBookingView();
  });

  document.getElementById('bookingForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const clientName = document.getElementById('clientNameInput')?.value.trim();
    const clientPhone = document.getElementById('clientPhoneInput')?.value.trim();
    if (!clientName || !clientPhone) {
      showToast('Please enter your name and WhatsApp number');
      return;
    }

    const { style, selectedAddOns, subtotal, discount, total, deposit } = getBookingTotals();
    const sizeObj = SIZE_OPTIONS.find((s) => s.id === ui.bookSize);
    const lenObj = LENGTH_OPTIONS.find((l) => l.id === ui.bookLength);
    const colObj = HAIR_COLORS.find((c) => c.id === ui.bookColorId) || HAIR_COLORS[0];
    const stylist = STYLISTS.find((s) => s.id === ui.bookStylistId) || STYLISTS[0];

    const created = await store.createBooking({
      clientName,
      clientPhone,
      styleId: style.id,
      styleName: style.name,
      styleImage: style.image,
      size: ui.bookSize,
      sizeLabel: sizeObj?.label || 'Medium',
      length: ui.bookLength,
      lengthLabel: lenObj?.label || 'Midback',
      hairColor: `${colObj.code} ${colObj.name}`,
      stylistId: stylist.id,
      stylistName: stylist.name,
      date: ui.bookDate,
      time: ui.bookTime,
      addOns: selectedAddOns.map((a) => a.name),
      promoCode: ui.appliedPromo?.code || null,
      subtotal,
      discount,
      total,
      deposit,
      paymentMethod: document.getElementById('paymentMethodSelect')?.value || 'Orange Money (72517904)',
      notes: document.getElementById('bookingNotesInput')?.value.trim() || ''
    });

    launchIceConfetti();
    openBookingPassModal(created);
  });

  // Concierge Messenger events
  document.getElementById('backToThreadsBtn')?.addEventListener('click', () => {
    ui.mobileConvOpen = false;
    renderMessenger();
  });
  document.getElementById('modeClientBtn')?.addEventListener('click', () => {
    ui.senderMode = 'client';
    renderMessenger();
  });
  document.getElementById('modeSalonBtn')?.addEventListener('click', () => {
    ui.senderMode = 'salon';
    renderMessenger();
  });

  document.querySelectorAll('#chatQuickChips [data-quick-msg]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const text = btn.dataset.quickMsg;
      store.sendMessage({
        threadId: ui.activeThreadId,
        sender: 'client',
        senderName: 'You',
        text
      });
      scrollChatBottom();
      triggerSmartAutoReply(text);
    });
  });

  document.getElementById('chatImageInput')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    ui.pendingChatAttachment = await compressImageFile(file, 840, 0.82);
    const strip = document.getElementById('chatAttachmentPreview');
    if (strip) {
      strip.classList.remove('hidden');
      strip.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
          <img src="${ui.pendingChatAttachment}" alt="Preview" />
          <span style="font-size:12px;">Photo ready to send</span>
        </div>
        <button type="button" class="mini-action-chip" id="removeChatPhotoBtn">Remove</button>
      `;
      document.getElementById('removeChatPhotoBtn')?.addEventListener('click', () => {
        ui.pendingChatAttachment = null;
        strip.classList.add('hidden');
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
      threadId: ui.activeThreadId,
      sender: ui.senderMode,
      senderName: isClient ? 'You' : 'Nicole',
      text: text || 'Shared an inspiration photo',
      image: ui.pendingChatAttachment
    });

    if (inp) inp.value = '';
    ui.pendingChatAttachment = null;
    document.getElementById('chatAttachmentPreview')?.classList.add('hidden');
    scrollChatBottom();

    if (isClient) {
      triggerSmartAutoReply(text);
    }
  });

  // Add Hairstyle Modal triggers & submission (Protected behind Admin Auth!)
  const openAddStyle = () => requireAdminAuth(() => openModal('addStyleModal'));
  document.getElementById('marketAddStyleBtn')?.addEventListener('click', openAddStyle);
  document.getElementById('studioAddStyleBtn')?.addEventListener('click', openAddStyle);
  document.getElementById('studioNewStyleInlineBtn')?.addEventListener('click', openAddStyle);

  document.getElementById('newStylePricingMode')?.addEventListener('change', (e) => {
    document
      .getElementById('newStyleFlatPriceWrap')
      ?.classList.toggle('hidden', e.target.value !== 'flat');
  });

  document.getElementById('newStylePhotoInput')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    ui.newStyleImage = await compressImageFile(file, 920, 0.84);
    const img = document.getElementById('newStylePreviewImg');
    if (img) img.src = ui.newStyleImage;
  });

  document.getElementById('addStyleForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('newStyleName')?.value.trim();
    if (!name) return;

    const pricingMode = document.getElementById('newStylePricingMode')?.value || 'matrix';
    await store.addStyle({
      name,
      category: document.getElementById('newStyleCategory')?.value || 'Knotless',
      badge: document.getElementById('newStyleBadge')?.value.trim() || 'New Drop',
      image: ui.newStyleImage,
      pricingMode,
      flatPrice:
        pricingMode === 'flat'
          ? Number(document.getElementById('newStyleFlatPrice')?.value || 250)
          : undefined,
      defaultSize: document.getElementById('newStyleDefaultSize')?.value || 'medium',
      defaultLength: document.getElementById('newStyleDefaultLength')?.value || 'midback',
      duration: document.getElementById('newStyleDuration')?.value.trim() || '4 – 5 hrs',
      packs: document.getElementById('newStylePacks')?.value.trim() || '5–6 packs',
      description:
        document.getElementById('newStyleDesc')?.value.trim() ||
        'Custom salon hairstyle crafted at Nicole Beauty Parlour.',
      tags: ['New Drop', 'Custom Style']
    });

    closeModal('addStyleModal');
    launchIceConfetti();
    showToast(`"${name}" published to Gallery!`);
    e.target.reset();
  });

  // Launch Advert & Live Poster Studio triggers (Protected behind Admin Auth!)
  const openPromoStudio = () =>
    requireAdminAuth(() => {
      ui.newPromoCustomImage = null;
      openModal('addPromoModal');
      refreshLivePromoCanvas();
    });
  document.getElementById('newPromoFromHomeBtn')?.addEventListener('click', openPromoStudio);
  document.getElementById('studioLaunchPromoBtn')?.addEventListener('click', openPromoStudio);
  document.getElementById('studioNewAdInlineBtn')?.addEventListener('click', openPromoStudio);

  [
    'promoTitleInput',
    'promoSubtitleInput',
    'promoDiscountInput',
    'promoCodeInput',
    'promoPriceHighlight',
    'promoStyleSelect',
    'promoThemeSelect'
  ].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', refreshLivePromoCanvas);
    document.getElementById(id)?.addEventListener('change', refreshLivePromoCanvas);
  });

  document.getElementById('promoCustomPhotoInput')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    ui.newPromoCustomImage = await compressImageFile(file, 980, 0.85);
    refreshLivePromoCanvas();
  });

  document.getElementById('addPromoForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const draft = getDraftPromoFromForm();
    const created = await store.createPromotion(draft);
    closeModal('addPromoModal');
    launchIceConfetti();
    showToast(`Campaign ${created.code} is LIVE!`);
    await openFlyerPreviewModal(created);
  });

  // Flyer download & share
  document.getElementById('downloadFlyerBtn')?.addEventListener('click', () => {
    if (!ui.lastFlyerBlob) return;
    const url = URL.createObjectURL(ui.lastFlyerBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Nicole-Beauty-Parlour-${ui.lastFlyerPromo?.code || 'Poster'}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    showToast('1080×1350 HD Poster downloaded!');
  });

  document.getElementById('shareFlyerBtn')?.addEventListener('click', async () => {
    if (ui.lastFlyerBlob && navigator.share) {
      try {
        const file = new File([ui.lastFlyerBlob], 'nicole-parlour-offer.png', { type: 'image/png' });
        await navigator.share({
          title: ui.lastFlyerPromo?.title || 'Nicole Beauty Parlour',
          text: `${ui.lastFlyerPromo?.title} — Use code ${ui.lastFlyerPromo?.code} at Nicole Beauty Parlour (${SALON_INFO.phoneDisplay})!`,
          files: navigator.canShare?.({ files: [file] }) ? [file] : undefined
        });
        return;
      } catch {
        // Fallback below
      }
    }
    const waText = encodeURIComponent(
      `${ui.lastFlyerPromo?.title || 'Special Offer'} at Nicole Beauty Parlour! Use code ${
        ui.lastFlyerPromo?.code || 'SLAY15'
      } — WhatsApp ${SALON_INFO.phoneDisplay}`
    );
    window.open(`https://wa.me/?text=${waText}`, '_blank', 'noopener');
  });

  // Native PWA install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    ui.deferredInstallPrompt = e;
    document.getElementById('nativeInstallPromptBtn')?.classList.remove('hidden');
  });

  document.getElementById('nativeInstallPromptBtn')?.addEventListener('click', async () => {
    if (!ui.deferredInstallPrompt) return;
    ui.deferredInstallPrompt.prompt();
    await ui.deferredInstallPrompt.userChoice;
    ui.deferredInstallPrompt = null;
    document.getElementById('nativeInstallPromptBtn')?.classList.add('hidden');
    closeModal('installModal');
  });
}

/* ================= BOOTSTRAP ================= */
function init() {
  applyTheme(ui.theme);
  initSplashExperience();
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

const products = [
  {
    id: 1,
    name: 'Samsung Galaxy A15',
    short: 'Samsung A15',
    price: 2199,
    target: 2000,
    store: 'Game',
    storeShort: 'G',
    category: 'Electronics',
    image:
      'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=80',
    rating: 4.8,
    shipping: 0,
    stock: 'In stock',
    condition: 'New',
    drop: '-8%',
    badge: 'Best price',
    saved: true,
    description: '128GB Android smartphone with 6.5" display, 50MP camera, and 5G connectivity.',
    history: [2399, 2299, 2199, 2249, 2199, 2149, 2199],
    variants: ['128GB', '256GB', 'Blue', 'Black']
  },
  {
    id: 2,
    name: 'Sony WH-CH720N',
    short: 'Sony Headphones',
    price: 1899,
    target: 1700,
    store: 'HiFi Corp',
    storeShort: 'H',
    category: 'Audio',
    image:
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80',
    rating: 4.7,
    shipping: 75,
    stock: 'Limited stock',
    condition: 'New',
    drop: '-12%',
    badge: 'Top rated',
    saved: false,
    description: 'Wireless over-ear headphones with noise cancelling and up to 35-hour battery life.',
    history: [2099, 2050, 1999, 1950, 1899, 1919, 1899],
    variants: ['Black', 'White', 'Case bundle']
  },
  {
    id: 3,
    name: 'Apple AirPods Pro 2',
    short: 'AirPods Pro 2',
    price: 3299,
    target: 2999,
    store: 'Incredible Connection',
    storeShort: 'I',
    category: 'Audio',
    image:
      'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=900&q=80',
    rating: 4.9,
    shipping: 0,
    stock: 'In stock',
    condition: 'New',
    drop: '-6%',
    badge: 'Trending',
    saved: true,
    description: 'Active Noise Cancellation with USB-C charging case and Bluetooth connectivity.',
    history: [3499, 3450, 3399, 3349, 3299, 3299, 3299],
    variants: ['USB-C', 'MagSafe case', 'Refurbished']
  },
  {
    id: 4,
    name: 'LG 55" 4K Smart TV',
    short: 'LG 55" TV',
    price: 5899,
    target: 5400,
    store: 'Game',
    storeShort: 'G',
    category: 'Home',
    image:
      'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=900&q=80',
    rating: 4.6,
    shipping: 180,
    stock: 'Warehouse stock',
    condition: 'New',
    drop: '-14%',
    badge: 'Delivery available',
    saved: false,
    description: '55-inch 4K UHD smart television with HDR, voice control, and slim bezel design.',
    history: [6299, 6199, 6099, 5999, 5949, 5899, 5899],
    variants: ['55"', '65"', 'Wall mount']
  },
  {
    id: 5,
    name: 'Dell XPS 13',
    short: 'Dell XPS 13',
    price: 12999,
    target: 11800,
    store: 'Square Mart',
    storeShort: 'S',
    category: 'Computing',
    image:
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80',
    rating: 4.8,
    shipping: 150,
    stock: 'In stock',
    condition: 'New',
    drop: '-9%',
    badge: 'Premium pick',
    saved: false,
    description: '13-inch ultrabook with Intel Core i7, 16GB RAM, and 1TB SSD storage.',
    history: [14999, 14499, 13999, 13599, 13199, 12999, 12999],
    variants: ['13" Touch', '16GB RAM', '1TB SSD']
  },
  {
    id: 6,
    name: 'Philips Air Fryer',
    short: 'Air Fryer',
    price: 1499,
    target: 1300,
    store: 'Shoprite',
    storeShort: 'S',
    category: 'Home',
    image:
      'https://images.unsplash.com/photo-1585518419759-7fe2e0fbf8a6?auto=format&fit=crop&w=900&q=80',
    rating: 4.5,
    shipping: 80,
    stock: 'In stock',
    condition: 'New',
    drop: '-10%',
    badge: 'Household deal',
    saved: true,
    description: 'Energy-efficient kitchen appliance for frying, roasting, and reheating with low oil.',
    history: [1799, 1699, 1599, 1549, 1499, 1499, 1499],
    variants: ['4.1L', '5.2L', 'Black']
  }
];

const savedItems = [
  { id: 1, name: 'Samsung A15', price: 2199, store: 'Game' },
  { id: 3, name: 'AirPods Pro 2', price: 3299, store: 'Incredible Connection' },
  { id: 6, name: 'Philips Air Fryer', price: 1499, store: 'Shoprite' }
];

const alerts = [
  { item: 'Sony WH-CH720N', target: 'P1,700', status: 'Watching' },
  { item: 'LG 55" TV', target: 'P5,400', status: 'Triggered' },
  { item: 'Dell XPS 13', target: 'P11,800', status: 'Watching' }
];

const categories = ['All', 'Electronics', 'Audio', 'Home', 'Computing'];

const state = {
  query: '',
  category: 'All',
  sort: 'best',
  listView: 'grid'
};

const money = new Intl.NumberFormat('en-BW', {
  style: 'currency',
  currency: 'BWP',
  maximumFractionDigits: 0
});

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

function getFilteredProducts() {
  const query = state.query.trim().toLowerCase();

  let filtered = [...products].filter((item) => {
    const matchesCategory = state.category === 'All' || item.category === state.category;
    const matchesQuery =
      !query ||
      item.name.toLowerCase().includes(query) ||
      item.store.toLowerCase().includes(query) ||
      item.short.toLowerCase().includes(query);

    return matchesCategory && matchesQuery;
  });

  filtered.sort((a, b) => {
    if (state.sort === 'cheapest') return a.price - b.price;
    if (state.sort === 'rating') return b.rating - a.rating;
    if (state.sort === 'shipping') return (a.shipping || 0) - (b.shipping || 0);
    return a.price - b.price;
  });

  return filtered;
}

function renderCategories() {
  const container = document.getElementById('categoryFilters');
  container.innerHTML = categories
    .map(
      (category) => `
        <button
          type="button"
          class="chip ${state.category === category ? 'active' : ''}"
          data-category="${category}"
        >
          ${category}
        </button>
      `
    )
    .join('');

  container.querySelectorAll('.chip').forEach((button) => {
    button.addEventListener('click', () => {
      state.category = button.dataset.category;
      render();
    });
  });
}

function renderSavedItems() {
  const list = document.getElementById('savedItemsList');
  list.innerHTML = savedItems
    .map(
      (item) => `
        <div class="saved-item">
          <div class="saved-copy">
            <strong>${escapeHtml(item.name)}</strong>
            <span>${escapeHtml(item.store)}</span>
          </div>
          <span class="saved-price">${money.format(item.price)}</span>
        </div>
      `
    )
    .join('');
}

function renderAlerts() {
  const list = document.getElementById('alertList');
  list.innerHTML = alerts
    .map(
      (alert) => `
        <div class="alert-item">
          <div>
            <strong>${escapeHtml(alert.item)}</strong>
            <span>${escapeHtml(alert.target)}</span>
          </div>
          <span class="status-pill ${alert.status === 'Triggered' ? 'danger' : 'success'}">
            ${alert.status}
          </span>
        </div>
      `
    )
    .join('');
}

function renderDealSpotlight() {
  const item = products[0];
  const spotlight = document.getElementById('dealSpotlight');

  spotlight.innerHTML = `
    <div class="deal-visual">
      <img src="${item.image}" alt="${escapeHtml(item.name)}" />
    </div>
    <div class="deal-copy">
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.description)}</p>
      <div class="deal-meta">
        <strong>${money.format(item.price)}</strong>
        <span>${item.drop} this week</span>
      </div>
    </div>
  `;
}

function renderProducts() {
  const productGrid = document.getElementById('productGrid');
  const items = getFilteredProducts();

  if (!items.length) {
    productGrid.innerHTML = `
      <div class="empty-state panel">
        <h3>No matches found</h3>
        <p>Try another keyword or switch to a different category.</p>
      </div>
    `;
    return;
  }

  productGrid.classList.toggle('list-view', state.listView === 'list');

  productGrid.innerHTML = items
    .map(
      (item) => `
        <article class="product-card ${state.listView === 'list' ? 'list-item' : ''}" data-id="${item.id}">
          <div class="product-image-wrap">
            <img src="${item.image}" alt="${escapeHtml(item.name)}" />
            <div class="image-badges">
              <span class="badge badge-blue">${item.badge}</span>
              <button type="button" class="save-button ${item.saved ? 'saved' : ''}" aria-label="Save item">
                ♥
              </button>
            </div>
          </div>

          <div class="product-body">
            <div class="store-row">
              <span class="store-pill">${escapeHtml(item.storeShort)}</span>
              <span class="rating">★ ${item.rating}</span>
            </div>

            <h3>${escapeHtml(item.name)}</h3>
            <p>${escapeHtml(item.condition)} • ${escapeHtml(item.stock)}</p>

            <div class="price-row">
              <div>
                <span class="amount">${money.format(item.price)}</span>
                <small>Target ${money.format(item.target)}</small>
              </div>
              <span class="drop-tag">${item.drop}</span>
            </div>

            <div class="meta-row">
              <span>${escapeHtml(item.category)}</span>
              <span>${item.shipping === 0 ? 'Free delivery' : `${money.format(item.shipping)} shipping`}</span>
            </div>
          </div>
        </article>
      `
    )
    .join('');

  productGrid.querySelectorAll('.product-card').forEach((card) => {
    card.addEventListener('click', (event) => {
      const target = event.target;
      if (target.closest('.save-button')) {
        event.stopPropagation();
        return;
      }

      const id = Number(card.dataset.id);
      openModal(id);
    });
  });
}

function openModal(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;

  const modal = document.getElementById('productModal');
  const modalContent = document.getElementById('modalContent');

  const historyBars = product.history
    .map(
      (value, index) => `
        <div class="bar-group" title="${money.format(value)}">
          <span class="bar" style="height: ${(value / Math.max(...product.history)) * 100}%"></span>
          <small>${['W', 'M', 'T', 'F', 'S', 'S', 'N'][index]}</small>
        </div>
      `
    )
    .join('');

  modalContent.innerHTML = `
    <div class="modal-hero">
      <img src="${product.image}" alt="${escapeHtml(product.name)}" />
    </div>
    <div class="modal-header">
      <div>
        <span class="eyebrow">${escapeHtml(product.store)}</span>
        <h3 id="modalTitle">${escapeHtml(product.name)}</h3>
      </div>
      <span class="badge success">${product.badge}</span>
    </div>

    <div class="modal-price">
      <div>
        <strong>${money.format(product.price)}</strong>
        <span>Price in BWP</span>
      </div>
      <button type="button" class="primary-btn small">Buy now</button>
    </div>

    <p class="modal-description">${escapeHtml(product.description)}</p>

    <div class="variant-row">
      ${product.variants.map((variant) => `<span>${escapeHtml(variant)}</span>`).join('')}
    </div>

    <div class="history-panel">
      <div class="panel-header">
        <span>Price history</span>
        <span>${product.drop}</span>
      </div>
      <div class="history-bars">
        ${historyBars}
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
}

function closeModal() {
  document.getElementById('productModal').classList.add('hidden');
}

function render() {
  renderCategories();
  renderSavedItems();
  renderAlerts();
  renderDealSpotlight();
  renderProducts();
}

function attachGlobalEvents() {
  document.getElementById('searchInput').addEventListener('input', (event) => {
    state.query = event.target.value;
    renderProducts();
  });

  document.getElementById('sortBy').addEventListener('change', (event) => {
    state.sort = event.target.value;
    renderProducts();
  });

  document.getElementById('toggleListView').addEventListener('click', () => {
    state.listView = state.listView === 'grid' ? 'list' : 'grid';
    document.getElementById('toggleListView').textContent = state.listView === 'grid' ? 'Grid view' : 'Card view';
    renderProducts();
  });

  document.getElementById('alertTrigger').addEventListener('click', () => {
    const item = products[0];
    alerts.unshift({ item: item.name, target: `${money.format(item.target)}`, status: 'Watching' });
    renderAlerts();
  });

  document.querySelector('.close-modal').addEventListener('click', closeModal);

  document.querySelectorAll('[data-close="true"]').forEach((el) => {
    el.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
  });
}

render();
attachGlobalEvents();

// Nicole Beauty Parlour — Catalog, Pricing Matrix & Starter Data
// All demo/mockup content has been cleared. Re-enter your real salon data below.

export const SALON_INFO = {
  name: '',
  tagline: '',
  phoneRaw: '',
  phoneIntl: '',
  phoneDisplay: '',
  instagram: '',
  location: '',
  hours: '',
  currency: '',
  symbol: '',
  depositPercent: 0,
  logo: '',
  logoDarkInk: '',
  logoLightInk: '',
  wordmarkDark: '',
  wordmarkLight: '',
  priceSheetImage: ''
};

export const SIZE_OPTIONS = [
  { id: 'jumbo', label: 'Jumbo' },
  { id: 'large', label: 'Large' },
  { id: 'medium', label: 'Medium' },
  { id: 'smedium', label: 'S_Medium' },
  { id: 'small', label: 'Small' },
];

export const LENGTH_OPTIONS = [
  { id: 'midback', label: 'Midback' },
  { id: 'butt', label: 'Butt Length' },
  { id: 'knee', label: 'Knee Length' },
];

export const HAIR_COLORS = [];

export const OFFICIAL_PRICE_MATRIX = {
  jumbo: { midback: 130, butt: 160, knee: 200 },
  large: { midback: 160, butt: 200, knee: 250 },
  medium: { midback: 180, butt: 250, knee: 300 },
  smedium: { midback: 200, butt: 300, knee: 400 },
  small: { midback: 250, butt: 350, knee: 500 },
};

// Live matrix — starts as the static default, then updated from the server
// or by the admin Price Matrix editor. calculateStylePrice reads this.
let liveMatrix = structuredClone(OFFICIAL_PRICE_MATRIX);

export function setPriceMatrix(matrix) {
  if (matrix && typeof matrix === 'object') {
    liveMatrix = structuredClone(matrix);
  }
}

export function getPriceMatrix() {
  return structuredClone(liveMatrix);
}

export const SPECIALTY_FLAT_PRICE = 250; // Pick n' Drop / Switch / Hardread / Softdread

export function calculateStylePrice(style, sizeId = 'medium', lengthId = 'midback') {
  if (!style) return 0;
  if (style.pricingMode === 'flat') {
    const base = Number(style.flatPrice || SPECIALTY_FLAT_PRICE);
    if (lengthId === 'knee') return base + 50;
    return base;
  }
  if (style.customMatrix && style.customMatrix[sizeId]?.[lengthId]) {
    return Number(style.customMatrix[sizeId][lengthId]);
  }
  const sizeRow = liveMatrix[sizeId] || liveMatrix.medium;
  if (!sizeRow) return 0;
  const matrixPrice = sizeRow[lengthId] ?? sizeRow.midback;
  const styleOffset = Number(style.priceOffset || 0);
  return Math.max(80, matrixPrice + styleOffset);
}

export const CATEGORIES = [
  'Knotless',
  'Twists',
  'Box Braids',
  'Softdread & Switch',
  'Boho & Curls',
  'Updos & Buns',
  'Cornrows'
];

export const ADD_ONS = [];

export const STYLISTS = [];

export const TIME_SLOTS = [];

// Real salon hairstyles — prices come from the live size × length matrix
// (calculateStylePrice). Photos are intentionally left empty; the owner adds
// them later from the admin "Services, Prices & Availability" panel.
export const INITIAL_HAIRSTYLES = [
  {
    id: 'knotless',
    name: 'Knotless',
    category: 'Knotless',
    image: '',
    pricingMode: 'matrix',
    priceOffset: 0,
    defaultSize: 'jumbo',
    defaultLength: 'midback',
    duration: '4 – 5 hrs',
    packs: '5–6 packs',
    description: 'Tension-free knotless braids — clean parting, no scalp pain.',
    badge: 'Bestseller',
    active: true,
    featured: true,
    rating: 5.0,
    reviewsCount: 1
  },
  {
    id: 'box-braids',
    name: 'Box Braids',
    category: 'Box Braids',
    image: '',
    pricingMode: 'matrix',
    priceOffset: 0,
    defaultSize: 'large',
    defaultLength: 'butt',
    duration: '5 – 6 hrs',
    packs: '6–8 packs',
    description: 'Classic box braids — neat, long-lasting and stylish.',
    badge: '',
    active: true,
    featured: true,
    rating: 5.0,
    reviewsCount: 1
  },
  {
    id: 'twist',
    name: 'Twist',
    category: 'Twists',
    image: '',
    pricingMode: 'matrix',
    priceOffset: 0,
    defaultSize: 'medium',
    defaultLength: 'butt',
    duration: '4 – 5 hrs',
    packs: '5–7 packs',
    description: 'Two-strand twists — soft, defined and easy to maintain.',
    badge: '',
    active: true,
    featured: true,
    rating: 5.0,
    reviewsCount: 1
  },
  {
    id: 'pick-n-drop',
    name: "Pick n' Drop",
    category: 'Softdread & Switch',
    image: '',
    pricingMode: 'flat',
    flatPrice: 250,
    defaultSize: 'medium',
    defaultLength: 'midback',
    duration: '2 – 3 hrs',
    packs: '3–4 packs',
    description: 'Quick pick n\' drop style — easy, fast and elegant.',
    badge: '',
    active: true,
    featured: false,
    rating: 5.0,
    reviewsCount: 1
  },
  {
    id: 'switch',
    name: 'Switch',
    category: 'Softdread & Switch',
    image: '',
    pricingMode: 'flat',
    flatPrice: 250,
    defaultSize: 'medium',
    defaultLength: 'midback',
    duration: '3 – 4 hrs',
    packs: '4–5 packs',
    description: 'Switch braids — a protective style with a clean finish.',
    badge: '',
    active: true,
    featured: false,
    rating: 5.0,
    reviewsCount: 1
  },
  {
    id: 'hardread',
    name: 'Hardread',
    category: 'Softdread & Switch',
    image: '',
    pricingMode: 'flat',
    flatPrice: 250,
    defaultSize: 'medium',
    defaultLength: 'midback',
    duration: '2 – 3 hrs',
    packs: '3–4 packs',
    description: 'Hardread style — crisp edges with a polished look.',
    badge: '',
    active: true,
    featured: false,
    rating: 5.0,
    reviewsCount: 1
  },
  {
    id: 'softdread',
    name: 'Softdread',
    category: 'Softdread & Switch',
    image: '',
    pricingMode: 'flat',
    flatPrice: 250,
    defaultSize: 'medium',
    defaultLength: 'midback',
    duration: '3 – 4 hrs',
    packs: '4–5 packs',
    description: 'Softdread — gentle, voluminous and comfortable to wear.',
    badge: '',
    active: true,
    featured: false,
    rating: 5.0,
    reviewsCount: 1
  }
];

export const INITIAL_PROMOTIONS = [];

export const INITIAL_BOOKINGS = [];

export const INITIAL_THREADS = [];

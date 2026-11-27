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

export const SIZE_OPTIONS = [];

export const LENGTH_OPTIONS = [];

export const HAIR_COLORS = [];

export const OFFICIAL_PRICE_MATRIX = {};

export const SPECIALTY_FLAT_PRICE = 250; // Default flat-rate fallback (code default, not demo data)

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
  const sizeRow = OFFICIAL_PRICE_MATRIX[sizeId] || OFFICIAL_PRICE_MATRIX.medium;
  if (!sizeRow) return 0;
  const matrixPrice = sizeRow[lengthId] ?? sizeRow.midback;
  const styleOffset = Number(style.priceOffset || 0);
  return Math.max(80, matrixPrice + styleOffset);
}

export const CATEGORIES = [];

export const ADD_ONS = [];

export const STYLISTS = [];

export const TIME_SLOTS = [];

export const INITIAL_HAIRSTYLES = [];

export const INITIAL_PROMOTIONS = [];

export const INITIAL_BOOKINGS = [];

export const INITIAL_THREADS = [];

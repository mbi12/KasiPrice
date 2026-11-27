// Official Nicole Beauty Parlour Catalog, Pricing Matrix & Starter Data
export const SALON_INFO = {
  name: 'Nicole Beauty Parlour',
  tagline: 'Look Good • Feel Good • Be You',
  phoneRaw: '72517904',
  phoneIntl: '26772517904',
  phoneDisplay: '+267 72 517 904',
  instagram: '@NICOLE_BEAUTY_PARLOUR',
  location: 'Gaborone, Botswana',
  hours: 'Mon – Sun • 07:30 – 19:30',
  currency: 'BWP',
  symbol: 'P',
  depositPercent: 30,
  logo: '/images/nicole-logo.jpg',
  priceSheetImage: '/images/price-menu-card.jpg'
};

export const SIZE_OPTIONS = [
  { id: 'jumbo', label: 'Jumbo', short: 'Jumbo', durationHrs: '2 – 3 hrs', packs: '3–4 packs' },
  { id: 'large', label: 'Large', short: 'Large', durationHrs: '3 – 4 hrs', packs: '4–5 packs' },
  { id: 'medium', label: 'Medium', short: 'Medium', durationHrs: '4 – 5 hrs', packs: '5–6 packs' },
  { id: 's_medium', label: 'S-Medium', short: 'S-Med', durationHrs: '5 – 6.5 hrs', packs: '6–7 packs' },
  { id: 'small', label: 'Small', short: 'Small', durationHrs: '6.5 – 8 hrs', packs: '7–9 packs' }
];

export const LENGTH_OPTIONS = [
  { id: 'midback', label: 'Midback', extraHrs: 0 },
  { id: 'butt', label: 'Butt Length', extraHrs: 1 },
  { id: 'knee', label: 'Knee Length', extraHrs: 2 }
];

// Exact official BWP pricing from @NICOLE_BEAUTY_PARLOUR price card
export const OFFICIAL_PRICE_MATRIX = {
  jumbo: { midback: 130, butt: 160, knee: 200 },
  large: { midback: 160, butt: 200, knee: 250 },
  medium: { midback: 180, butt: 250, knee: 300 },
  s_medium: { midback: 200, butt: 300, knee: 400 },
  small: { midback: 250, butt: 350, knee: 500 }
};

export const SPECIALTY_FLAT_PRICE = 250; // Pick n' drop / Switch / Hardread / Softdread = P250

export function calculateStylePrice(style, sizeId = 'medium', lengthId = 'midback') {
  if (!style) return 180;
  if (style.pricingMode === 'flat') {
    const base = Number(style.flatPrice || SPECIALTY_FLAT_PRICE);
    if (lengthId === 'knee') return base + 50;
    return base;
  }
  if (style.customMatrix && style.customMatrix[sizeId]?.[lengthId]) {
    return Number(style.customMatrix[sizeId][lengthId]);
  }
  const sizeRow = OFFICIAL_PRICE_MATRIX[sizeId] || OFFICIAL_PRICE_MATRIX.medium;
  const matrixPrice = sizeRow[lengthId] ?? sizeRow.midback;
  const styleOffset = Number(style.priceOffset || 0);
  return Math.max(80, matrixPrice + styleOffset);
}

export const CATEGORIES = [
  { id: 'all', label: 'All Styles', icon: '✨' },
  { id: 'Knotless', label: 'Knotless', icon: '👑' },
  { id: 'Box Braids', label: 'Box Braids', icon: '💎' },
  { id: 'Twists', label: 'Twists', icon: '🌀' },
  { id: 'Updos & Buns', label: 'Updos & Buns', icon: '🎀' },
  { id: 'Softdread & Switch', label: "Pick n' Drop / Dread", icon: '🔥' }
];

export const ADD_ONS = [
  { id: 'blowdry', name: 'Gentle Detangle & Blowdry Prep', price: 40, icon: '💨' },
  { id: 'boho_curls', name: 'Boho Curly Ends Tuck-In', price: 50, icon: '〰️' },
  { id: 'beads_cuffs', name: 'Gold Cuffs & Crystal Beads', price: 25, icon: '✨' },
  { id: 'hair_included', name: 'Braiding Hair Packs Provided', price: 120, icon: '🛍️' },
  { id: 'house_call', name: 'VIP House-Call (Gaborone)', price: 80, icon: '🚗' }
];

export const STYLISTS = [
  {
    id: 'nicole',
    name: 'Nicole',
    role: 'Founder & Lead Braider',
    rating: 5.0,
    specialty: 'Pain-free Knotless & French Curls',
    avatar: '/images/style-06-golden-velvet-updo.jpg',
    badge: 'Master Stylist'
  },
  {
    id: 'nicky',
    name: 'Nicky',
    role: 'Senior Twist & Updo Artist',
    rating: 4.9,
    specialty: 'Softdread, Rope Twists & Crown Buns',
    avatar: '/images/style-10-sleek-senegalese-twists.jpg',
    badge: 'Top Rated'
  },
  {
    id: 'tshepo',
    name: 'Tshepo',
    role: 'Small & Knee-Length Specialist',
    rating: 4.9,
    specialty: 'Precision Grid Parting & Extra Long',
    avatar: '/images/style-05-caramel-high-pony.jpg',
    badge: 'Fast Hands'
  },
  {
    id: 'any',
    name: 'First Available',
    role: 'Fastest Open Chair',
    rating: 4.9,
    specialty: 'Earliest guaranteed appointment slot',
    avatar: '/images/nicole-logo.jpg',
    badge: 'Quickest'
  }
];

export const TIME_SLOTS = [
  '07:30',
  '09:00',
  '10:30',
  '12:00',
  '13:30',
  '15:00',
  '16:30'
];

export const INITIAL_HAIRSTYLES = [
  {
    id: 'style-01',
    name: 'Honey Blonde Curly-Ends Knotless',
    category: 'Knotless',
    image: '/images/style-01-honey-curly-knotless.jpg',
    defaultSize: 'medium',
    defaultLength: 'midback',
    pricingMode: 'matrix',
    priceOffset: 0,
    rating: 5.0,
    reviewsCount: 64,
    badge: 'Most Booked',
    featured: true,
    saved: true,
    duration: '4 – 5 hrs',
    packs: '5 packs (#27/#30)',
    description: 'Signature tension-free knotless braids in warm honey blonde (#27/#30) finished with lush, bouncy spiral curly ends that frame the face.',
    tags: ['Tension-free', 'Curly Ends', 'Color #27/#30', 'Lightweight']
  },
  {
    id: 'style-14',
    name: 'Burgundy Ombre French Curl Knotless',
    category: 'Knotless',
    image: '/images/style-14-burgundy-french-curl.jpg',
    defaultSize: 'medium',
    defaultLength: 'butt',
    pricingMode: 'matrix',
    priceOffset: 0,
    rating: 5.0,
    reviewsCount: 52,
    badge: 'Trending',
    featured: true,
    saved: true,
    duration: '4.5 – 5.5 hrs',
    packs: '6 packs French Curl',
    description: 'Sleek dark-root knotless braids melting into rich wine-burgundy bouncy curls. Ultra-neat parting with silky movement.',
    tags: ['Ombre Wine', 'French Curl', 'Butt Length', 'Glossy Finish']
  },
  {
    id: 'style-13',
    name: 'Spring Softdread & Passion Curly Twists',
    category: 'Softdread & Switch',
    image: '/images/style-13-passion-curly-twists.jpg',
    defaultSize: 'medium',
    defaultLength: 'midback',
    pricingMode: 'flat',
    flatPrice: 250,
    rating: 4.9,
    reviewsCount: 47,
    badge: 'Flat P250 Deal',
    featured: true,
    saved: false,
    duration: '3.5 – 4.5 hrs',
    packs: '5 packs Water Wave / Passion',
    description: 'Defined springy passion & softdread twists installed with painless knotless roots for effortless volume and high-ponytail versatility.',
    tags: ['Softdread', 'Flat P250', 'High Pony Ready', 'Soft Roots']
  },
  {
    id: 'style-05',
    name: 'Caramel Sleek High-Ponytail Knotless',
    category: 'Updos & Buns',
    image: '/images/style-05-caramel-high-pony.jpg',
    defaultSize: 'medium',
    defaultLength: 'butt',
    pricingMode: 'matrix',
    priceOffset: 0,
    rating: 5.0,
    reviewsCount: 41,
    badge: 'Signature Look',
    featured: true,
    saved: true,
    duration: '4.5 hrs',
    packs: '5–6 packs (#30)',
    description: 'Crisp geometric parting engineered for a snatch-free high ponytail that lays flat and comfortable from day one.',
    tags: ['Ponytail Ready', 'Caramel #30', 'Zero Tension', 'Clean Parts']
  },
  {
    id: 'style-06',
    name: 'Golden Blonde Velvet Scrunchie Updo',
    category: 'Updos & Buns',
    image: '/images/style-06-golden-velvet-updo.jpg',
    defaultSize: 'medium',
    defaultLength: 'midback',
    pricingMode: 'matrix',
    priceOffset: 0,
    rating: 4.9,
    reviewsCount: 38,
    badge: 'Glam Pick',
    featured: true,
    saved: false,
    duration: '4 hrs',
    packs: '5 packs (#27)',
    description: 'Radiant golden #27 knotless crown styled high with baby-hair detailing — ideal for birthdays, graduations, and events.',
    tags: ['Birthday Glam', 'Golden #27', 'Baby Hair Lay', 'Event Ready']
  },
  {
    id: 'style-15',
    name: 'Precision Grid Pain-Free Knotless',
    category: 'Knotless',
    image: '/images/style-15-precision-knotless-grid.jpg',
    defaultSize: 's_medium',
    defaultLength: 'butt',
    pricingMode: 'matrix',
    priceOffset: 0,
    rating: 5.0,
    reviewsCount: 59,
    badge: 'Cleanest Parts',
    featured: false,
    saved: false,
    duration: '5 – 6 hrs',
    packs: '6 packs (#1B)',
    description: 'Mirror-sharp square grid parting with flat, natural-looking feed-in starts that protect your edges and hairline.',
    tags: ['Mirror Grid', 'Edge Safe', 'S-Medium', 'Long Lasting']
  },
  {
    id: 'style-11',
    name: 'Goddess Boho Knee-Length Braids',
    category: 'Knotless',
    image: '/images/style-11-goddess-boho-knee.jpg',
    defaultSize: 's_medium',
    defaultLength: 'knee',
    pricingMode: 'matrix',
    priceOffset: 0,
    rating: 5.0,
    reviewsCount: 44,
    badge: 'Luxury',
    featured: true,
    saved: false,
    duration: '6 – 7 hrs',
    packs: '7 packs + Deep Wave',
    description: 'Show-stopping extra-long braids cascading into lush goddess curls for maximum glamour and movement.',
    tags: ['Boho Curls', 'Knee Length', 'Vacation Vibes', 'VIP Favourite']
  },
  {
    id: 'style-12',
    name: 'Honey-Brown Small Extra-Long Knotless',
    category: 'Knotless',
    image: '/images/style-12-honey-small-knee.jpg',
    defaultSize: 'small',
    defaultLength: 'knee',
    pricingMode: 'matrix',
    priceOffset: 0,
    rating: 4.9,
    reviewsCount: 36,
    badge: '8-Week Wear',
    featured: false,
    saved: false,
    duration: '7 – 8 hrs',
    packs: '8 packs (#30/#4)',
    description: 'Feather-light small honey-brown knotless braids with tucked ends that stay neat up to 8 weeks.',
    tags: ['Small Size', 'Knee Length', 'Tucked Ends', 'Honey #30']
  },
  {
    id: 'style-03',
    name: 'Royal High Crown Braided Bun',
    category: 'Updos & Buns',
    image: '/images/style-03-royal-high-bun.jpg',
    defaultSize: 'medium',
    defaultLength: 'butt',
    pricingMode: 'matrix',
    priceOffset: 0,
    rating: 4.9,
    reviewsCount: 33,
    badge: 'Chic & Regal',
    featured: false,
    saved: false,
    duration: '4 – 5 hrs',
    packs: '6 packs (#1B)',
    description: 'Versatile medium knotless braids sculpted into an effortless royal top-knot bun — wear it up for work or down on weekends.',
    tags: ['2-in-1 Style', 'Top Knot', 'Office Friendly', 'Jet Black']
  },
  {
    id: 'style-04',
    name: '613 Platinum & Honey Mix Box Braids',
    category: 'Box Braids',
    image: '/images/style-04-613-ombre-blend.jpg',
    defaultSize: 'large',
    defaultLength: 'butt',
    pricingMode: 'matrix',
    priceOffset: 0,
    rating: 4.8,
    reviewsCount: 29,
    badge: 'Custom Color Mix',
    featured: false,
    saved: false,
    duration: '3.5 – 4 hrs',
    packs: '5 packs (#613 + #27 + #1B)',
    description: 'Custom hand-blended platinum #613, honey #27, and espresso #1B braids for a dimensional sun-kissed statement.',
    tags: ['Hand Blended', '613 Blonde', 'Large Size', 'Quick Sit']
  },
  {
    id: 'style-02',
    name: 'Crystal Beaded Pigtail Bob Braids',
    category: 'Updos & Buns',
    image: '/images/style-02-beaded-pigtail-bob.jpg',
    defaultSize: 'medium',
    defaultLength: 'midback',
    pricingMode: 'matrix',
    priceOffset: 0,
    rating: 4.9,
    reviewsCount: 31,
    badge: 'Beaded Finish',
    featured: false,
    saved: false,
    duration: '3.5 hrs',
    packs: '4 packs + Clear Beads',
    description: 'Playful double high-pigtail braids finished with sparkling clear acrylic beads and sleek laid edges.',
    tags: ['Crystal Beads', 'Double Pony', 'Shoulder/Midback', 'Cute & Light']
  },
  {
    id: 'style-08',
    name: 'Long Sleek Passion & Rope Twists',
    category: 'Twists',
    image: '/images/style-08-long-rope-twists.jpg',
    defaultSize: 'medium',
    defaultLength: 'butt',
    pricingMode: 'matrix',
    priceOffset: 0,
    rating: 4.9,
    reviewsCount: 35,
    badge: 'Summer Hit',
    featured: false,
    saved: false,
    duration: '4 – 5 hrs',
    packs: '6 packs Twist Hair',
    description: 'Glossy waist-skimming two-strand twists with soft curled tips that never unravel.',
    tags: ['Two-Strand', 'Curled Tips', 'Butt Length', 'Protective']
  },
  {
    id: 'style-09',
    name: 'Burgundy Maroon Havana Bob Twists',
    category: 'Twists',
    image: '/images/style-09-burgundy-bob-twists.jpg',
    defaultSize: 'jumbo',
    defaultLength: 'midback',
    pricingMode: 'matrix',
    priceOffset: 0,
    rating: 4.8,
    reviewsCount: 27,
    badge: 'Under 2.5 Hrs',
    featured: false,
    saved: false,
    duration: '2 – 2.5 hrs',
    packs: '4 packs Maroon (#99J)',
    description: 'Chunky, lightweight burgundy Havana twists cut into a flattering collarbone bob — super fast chair time!',
    tags: ['Jumbo P130', 'Wine #99J', 'Bob Cut', 'Express Style']
  },
  {
    id: 'style-10',
    name: 'Classic Sleek Senegalese Rope Twists',
    category: 'Twists',
    image: '/images/style-10-sleek-senegalese-twists.jpg',
    defaultSize: 'medium',
    defaultLength: 'midback',
    pricingMode: 'matrix',
    priceOffset: 0,
    rating: 4.9,
    reviewsCount: 39,
    badge: 'Timeless',
    featured: false,
    saved: false,
    duration: '4 hrs',
    packs: '5 packs Expression',
    description: 'Ultra-smooth, uniform Senegalese rope twists with gentle root tension and hot-water sealed ends.',
    tags: ['Senegalese', 'Smooth Shine', 'Work & Everyday', 'Edge Friendly']
  },
  {
    id: 'style-07',
    name: 'Jumbo Halo Crown Goddess Updo',
    category: 'Softdread & Switch',
    image: '/images/style-07-jumbo-crown-halo.jpg',
    defaultSize: 'jumbo',
    defaultLength: 'midback',
    pricingMode: 'matrix',
    priceOffset: 0,
    rating: 4.8,
    reviewsCount: 24,
    badge: 'P130 Express',
    featured: false,
    saved: false,
    duration: '1.5 – 2 hrs',
    packs: '3 packs + Cuffs',
    description: 'Regal jumbo crown halo braid accented with metallic cuffs — our fastest protective glam transformation.',
    tags: ['P130 Budget Gem', '90 Mins', 'Bridal & Events', 'Crown Halo']
  },
  {
    id: 'style-16',
    name: 'Classic Jet-Black Midback Knotless',
    category: 'Box Braids',
    image: '/images/style-16-classic-midback-knotless.jpg',
    defaultSize: 'medium',
    defaultLength: 'midback',
    pricingMode: 'matrix',
    priceOffset: 0,
    rating: 5.0,
    reviewsCount: 58,
    badge: 'Everyday Icon',
    featured: false,
    saved: false,
    duration: '4 hrs',
    packs: '5 packs (#1B)',
    description: 'Full, glossy #1B medium braids dipped in hot water for feather-soft movement that suits every occasion.',
    tags: ['Jet Black #1B', 'Midback P180', 'Feather Soft', 'All-Rounder']
  }
];

export const INITIAL_PROMOTIONS = [
  {
    id: 'promo-slay15',
    title: 'Month-End Slay Special',
    subtitle: '15% OFF all S-Medium & Small Knotless Braids + Free Mousse Finish!',
    discountPercent: 15,
    code: 'SLAY15',
    styleId: 'style-01',
    image: '/images/style-01-honey-curly-knotless.jpg',
    priceHighlight: 'From P170',
    originalPrice: 'P200',
    validUntil: '2026-12-15',
    theme: 'royal-sky',
    active: true,
    badge: 'LIMITED OFFER',
    createdAt: '2026-11-27T08:00:00.000Z'
  },
  {
    id: 'promo-crown250',
    title: "Pick n' Drop & Softdread Deal",
    subtitle: 'Flat P250 all sizes + complimentary gold braid cuffs on weekday mornings.',
    discountPercent: 10,
    code: 'CROWN250',
    styleId: 'style-13',
    image: '/images/style-13-passion-curly-twists.jpg',
    priceHighlight: 'Flat P250',
    originalPrice: 'P290',
    validUntil: '2026-12-20',
    theme: 'obsidian-gold',
    active: true,
    badge: 'HOT DEAL',
    createdAt: '2026-11-27T09:00:00.000Z'
  },
  {
    id: 'promo-bestie',
    title: 'Bestie Duo Glam Package',
    subtitle: 'Book 2 chairs together with your bestie & get P40 OFF each appointment!',
    discountPercent: 12,
    code: 'BESTIE40',
    styleId: 'style-14',
    image: '/images/style-14-burgundy-french-curl.jpg',
    priceHighlight: 'Save P80 Pair',
    originalPrice: 'Group Perk',
    validUntil: '2026-12-31',
    theme: 'berry-velvet',
    active: true,
    badge: 'SQUAD PERK',
    createdAt: '2026-11-27T10:00:00.000Z'
  }
];

export const INITIAL_BOOKINGS = [
  {
    id: 'NBP-8421',
    clientName: 'Lesego M.',
    clientPhone: '+267 74 112 890',
    styleId: 'style-01',
    styleName: 'Honey Blonde Curly-Ends Knotless',
    styleImage: '/images/style-01-honey-curly-knotless.jpg',
    size: 'medium',
    sizeLabel: 'Medium',
    length: 'butt',
    lengthLabel: 'Butt Length',
    stylistId: 'nicole',
    stylistName: 'Nicole',
    date: '2026-11-29',
    time: '09:00',
    addOns: ['Gentle Detangle & Blowdry Prep'],
    promoCode: 'SLAY15',
    subtotal: 290,
    discount: 44,
    total: 246,
    deposit: 74,
    paymentMethod: 'Orange Money (72517904)',
    notes: 'Color #27 mixed with #30 curly tips please 💙',
    status: 'Confirmed',
    createdAt: '2026-11-27T09:30:00.000Z'
  }
];

export const INITIAL_THREADS = [
  {
    id: 'thread-nicole',
    title: 'Nicole • Booking & Style Desk',
    subtitle: 'Typically replies in under 1 min • +267 72 517 904',
    avatar: '/images/nicole-logo.jpg',
    online: true,
    pinned: true,
    unread: 1,
    role: 'Lead Stylist',
    messages: [
      {
        id: 'm-1',
        sender: 'salon',
        senderName: 'Nicole',
        text: 'Dumelang queen! 👑💙 Welcome to Nicole Beauty Parlour — Look Good, Feel Good, Be You! Ask me about any braid size, hair packs to buy, open slots, or send a style photo here.',
        timestamp: '08:30',
        status: 'read'
      },
      {
        id: 'm-2',
        sender: 'salon',
        senderName: 'Nicole',
        text: 'Tip: Our Knotless, Box Braids & Twists start at just P130 (Jumbo Midback) up to Small Knee Length (P500), and Pick n’ Drop / Softdread is flat P250! Use code SLAY15 when booking today ✨',
        timestamp: '08:31',
        status: 'unread'
      }
    ]
  },
  {
    id: 'thread-promos',
    title: 'VIP Deals & Flash Adverts',
    subtitle: 'Live salon offers & new style drops',
    avatar: '/images/style-14-burgundy-french-curl.jpg',
    online: true,
    pinned: false,
    unread: 0,
    role: 'Broadcast Channel',
    messages: [
      {
        id: 'm-p1',
        sender: 'salon',
        senderName: 'Nicole Promo Studio',
        text: '🔥 MONTH-END SLAY SPECIAL: Get 15% OFF with code SLAY15! Tap any style in the Market to calculate your exact BWP price.',
        image: '/images/style-01-honey-curly-knotless.jpg',
        badge: 'PROMO • SLAY15',
        timestamp: '09:00',
        status: 'read'
      }
    ]
  },
  {
    id: 'thread-care',
    title: 'Braid Prep & Aftercare Guide',
    subtitle: 'Packs guide, wash prep & mousse tips',
    avatar: '/images/style-15-precision-knotless-grid.jpg',
    online: true,
    pinned: false,
    unread: 0,
    role: 'Care Concierge',
    messages: [
      {
        id: 'm-c1',
        sender: 'salon',
        senderName: 'Nicky • Stylist',
        text: '✨ Before your appointment: Come with freshly washed, product-free hair (or add our P40 Gentle Detangle & Blowdry Prep during booking!). Need us to supply the hair packs? Just tick "Braiding Hair Packs Provided"!',
        timestamp: 'Yesterday',
        status: 'read'
      }
    ]
  }
];

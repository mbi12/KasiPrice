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
  logoDarkInk: '/images/nicole-logo-transparent.png',
  logoLightInk: '/images/nicole-logo-light.png',
  wordmarkDark: '/images/nicole-wordmark-dark.png',
  wordmarkLight: '/images/nicole-wordmark-light.png',
  priceSheetImage: '/images/price-menu-card.jpg'
};

export const SIZE_OPTIONS = [
  { id: 'jumbo', label: 'Jumbo', short: 'Jumbo', durationHrs: '2 – 3 hrs', packs: '3–4 packs', strandWidth: 11 },
  { id: 'large', label: 'Large', short: 'Large', durationHrs: '3 – 4 hrs', packs: '4–5 packs', strandWidth: 8.5 },
  { id: 'medium', label: 'Medium', short: 'Medium', durationHrs: '4 – 5 hrs', packs: '5–6 packs', strandWidth: 6.2 },
  { id: 's_medium', label: 'S-Medium', short: 'S-Med', durationHrs: '5 – 6.5 hrs', packs: '6–7 packs', strandWidth: 4.4 },
  { id: 'small', label: 'Small', short: 'Small', durationHrs: '6.5 – 8 hrs', packs: '7–9 packs', strandWidth: 2.8 }
];

export const LENGTH_OPTIONS = [
  { id: 'midback', label: 'Midback', extraHrs: 0, markerY: 44, desc: 'Classic everyday flow' },
  { id: 'butt', label: 'Butt Length', extraHrs: 1, markerY: 68, desc: 'Signature waist-past glam' },
  { id: 'knee', label: 'Knee Length', extraHrs: 2, markerY: 90, desc: 'Show-stopping runway length' }
];

export const HAIR_COLORS = [
  { id: '1B', code: '#1B', name: 'Natural Jet Black', swatch: '#0B0F17', glow: 'rgba(41, 171, 226, 0.25)' },
  { id: '27', code: '#27', name: 'Honey Gold Blonde', swatch: '#C98A35', glow: 'rgba(201, 138, 53, 0.36)' },
  { id: '30', code: '#30', name: 'Warm Caramel Auburn', swatch: '#8F4E24', glow: 'rgba(143, 78, 36, 0.36)' },
  { id: '99J', code: '#99J', name: 'Rich Burgundy Wine', swatch: '#6A1633', glow: 'rgba(106, 22, 51, 0.40)' },
  { id: '613', code: '#613', name: 'Platinum Blonde Blend', swatch: '#E8D39E', glow: 'rgba(232, 211, 158, 0.35)' },
  { id: 'SKY', code: '#ICE', name: 'Signature Sky Peekaboo', swatch: '#29ABE2', glow: 'rgba(41, 171, 226, 0.50)' }
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
  { id: 'all', label: 'All Couture' },
  { id: 'Knotless', label: 'Knotless' },
  { id: 'Box Braids', label: 'Box Braids' },
  { id: 'Twists', label: 'Twists' },
  { id: 'Updos & Buns', label: 'Updos & Buns' },
  { id: 'Softdread & Switch', label: "Pick n' Drop / Dread" }
];

export const ADD_ONS = [
  { id: 'blowdry', name: 'Silk Detangle & Blowdry Prep', price: 40, tag: 'Edge Safe' },
  { id: 'boho_curls', name: 'French / Boho Curly Tuck-In', price: 50, tag: 'Most Popular' },
  { id: 'beads_cuffs', name: 'Crystal Beads & Silver/Ice Cuffs', price: 25, tag: 'Finish' },
  { id: 'hair_included', name: 'Premium Braiding Packs Supplied', price: 120, tag: 'Full Hair' },
  { id: 'house_call', name: 'VIP Private House-Call (Gaborone)', price: 80, tag: 'At Home' }
];

export const STYLISTS = [
  {
    id: 'nicole',
    chair: 'Chair 01',
    name: 'Nicole',
    role: 'Founder & Master Braider',
    rating: 5.0,
    specialty: 'Zero-tension Knotless & French Curls',
    avatar: '/images/style-06-golden-velvet-updo.jpg',
    badge: 'Founder'
  },
  {
    id: 'nicky',
    chair: 'Chair 02',
    name: 'Nicky',
    role: 'Senior Twist & Crown Artist',
    rating: 4.9,
    specialty: 'Softdread, Rope Twists & Sculpted Buns',
    avatar: '/images/style-10-sleek-senegalese-twists.jpg',
    badge: 'Senior Stylist'
  },
  {
    id: 'tshepo',
    chair: 'Chair 03',
    name: 'Tshepo',
    role: 'Precision Grid & Knee-Length Pro',
    rating: 4.9,
    specialty: 'Mirror-parting Small & Extra-Long Braids',
    avatar: '/images/style-05-caramel-high-pony.jpg',
    badge: 'Speed Pro'
  },
  {
    id: 'any',
    chair: 'Express',
    name: 'First Open Chair',
    role: 'Fastest Confirmed Slot',
    rating: 5.0,
    specialty: 'Matched automatically to earliest chair',
    avatar: '/images/style-01-honey-curly-knotless.jpg',
    badge: 'Fastest'
  }
];

export const TIME_SLOTS = ['07:30', '09:00', '10:30', '12:00', '13:30', '15:00', '16:30'];

export const INITIAL_HAIRSTYLES = [
  {
    id: 'style-01',
    name: 'Honey Blonde Curly-Ends Knotless',
    category: 'Knotless',
    image: '/images/style-01-honey-curly-knotless.jpg',
    defaultSize: 'medium',
    defaultLength: 'midback',
    defaultColor: '27',
    vibe: 'boho',
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
    defaultColor: '99J',
    vibe: 'boho',
    pricingMode: 'matrix',
    priceOffset: 0,
    rating: 5.0,
    reviewsCount: 52,
    badge: 'Runway Hit',
    featured: true,
    saved: true,
    duration: '4.5 – 5.5 hrs',
    packs: '6 packs French Curl',
    description: 'Sleek dark-root knotless braids melting into rich wine-burgundy bouncy French curls with mirror-crisp parting.',
    tags: ['Ombre #99J', 'French Curl', 'Butt Length', 'Silk Movement']
  },
  {
    id: 'style-13',
    name: 'Spring Softdread & Passion Curly Twists',
    category: 'Softdread & Switch',
    image: '/images/style-13-passion-curly-twists.jpg',
    defaultSize: 'medium',
    defaultLength: 'midback',
    defaultColor: '1B',
    vibe: 'locs',
    pricingMode: 'flat',
    flatPrice: 250,
    rating: 4.9,
    reviewsCount: 47,
    badge: 'Flat P250',
    featured: true,
    saved: false,
    duration: '3.5 – 4.5 hrs',
    packs: '5 packs Water Wave / Passion',
    description: 'Defined springy passion & softdread twists installed with painless knotless roots for effortless volume and high-ponytail versatility.',
    tags: ['Softdread', 'Flat P250', 'High Pony Ready', 'Zero Tension']
  },
  {
    id: 'style-05',
    name: 'Caramel Sleek High-Ponytail Knotless',
    category: 'Updos & Buns',
    image: '/images/style-05-caramel-high-pony.jpg',
    defaultSize: 'medium',
    defaultLength: 'butt',
    defaultColor: '30',
    vibe: 'updo',
    pricingMode: 'matrix',
    priceOffset: 0,
    rating: 5.0,
    reviewsCount: 41,
    badge: 'Signature Crown',
    featured: true,
    saved: true,
    duration: '4.5 hrs',
    packs: '5–6 packs (#30)',
    description: 'Crisp geometric parting engineered for a snatch-free high ponytail that lays flat and comfortable from day one.',
    tags: ['Ponytail Ready', 'Caramel #30', 'Zero Tension', 'Clean Grid']
  },
  {
    id: 'style-06',
    name: 'Golden Blonde Velvet Scrunchie Updo',
    category: 'Updos & Buns',
    image: '/images/style-06-golden-velvet-updo.jpg',
    defaultSize: 'medium',
    defaultLength: 'midback',
    defaultColor: '27',
    vibe: 'updo',
    pricingMode: 'matrix',
    priceOffset: 0,
    rating: 4.9,
    reviewsCount: 38,
    badge: 'VIP Event Pick',
    featured: true,
    saved: false,
    duration: '4 hrs',
    packs: '5 packs (#27)',
    description: 'Radiant golden #27 knotless crown styled high with sculpted baby-hair detailing — ideal for birthdays, graduations, and galas.',
    tags: ['Event Glam', 'Golden #27', 'Sculpted Edges', 'Crown Updo']
  },
  {
    id: 'style-15',
    name: 'Precision Grid Pain-Free Knotless',
    category: 'Knotless',
    image: '/images/style-15-precision-knotless-grid.jpg',
    defaultSize: 's_medium',
    defaultLength: 'butt',
    defaultColor: '1B',
    vibe: 'sleek',
    pricingMode: 'matrix',
    priceOffset: 0,
    rating: 5.0,
    reviewsCount: 59,
    badge: 'Mirror Grid',
    featured: true,
    saved: false,
    duration: '5 – 6 hrs',
    packs: '6 packs (#1B)',
    description: 'Laser-clean square grid parting with flat, natural-looking feed-in starts that protect your delicate hairline.',
    tags: ['Mirror Grid', 'Edge Safe', 'S-Medium', 'Long Wear']
  },
  {
    id: 'style-11',
    name: 'Goddess Boho Knee-Length Braids',
    category: 'Knotless',
    image: '/images/style-11-goddess-boho-knee.jpg',
    defaultSize: 's_medium',
    defaultLength: 'knee',
    defaultColor: '1B',
    vibe: 'boho',
    pricingMode: 'matrix',
    priceOffset: 0,
    rating: 5.0,
    reviewsCount: 44,
    badge: 'Couture Luxury',
    featured: true,
    saved: false,
    duration: '6 – 7 hrs',
    packs: '7 packs + Deep Wave',
    description: 'Show-stopping extra-long braids cascading into lush goddess curls for maximum runway glamour and movement.',
    tags: ['Boho Curls', 'Knee Length', 'Holiday Slay', 'VIP Favourite']
  },
  {
    id: 'style-12',
    name: 'Honey-Brown Small Extra-Long Knotless',
    category: 'Knotless',
    image: '/images/style-12-honey-small-knee.jpg',
    defaultSize: 'small',
    defaultLength: 'knee',
    defaultColor: '30',
    vibe: 'sleek',
    pricingMode: 'matrix',
    priceOffset: 0,
    rating: 4.9,
    reviewsCount: 36,
    badge: '8-Week Wear',
    featured: false,
    saved: false,
    duration: '7 – 8 hrs',
    packs: '8 packs (#30/#4)',
    description: 'Feather-light small honey-brown knotless braids with seamless tucked ends that stay salon-fresh up to 8 weeks.',
    tags: ['Small Size', 'Knee Length', 'Tucked Ends', 'Honey #30']
  },
  {
    id: 'style-03',
    name: 'Royal High Crown Braided Bun',
    category: 'Updos & Buns',
    image: '/images/style-03-royal-high-bun.jpg',
    defaultSize: 'medium',
    defaultLength: 'butt',
    defaultColor: '1B',
    vibe: 'updo',
    pricingMode: 'matrix',
    priceOffset: 0,
    rating: 4.9,
    reviewsCount: 33,
    badge: 'Regal Crown',
    featured: false,
    saved: false,
    duration: '4 – 5 hrs',
    packs: '6 packs (#1B)',
    description: 'Versatile medium knotless braids sculpted into an effortless royal top-knot bun — wear it up for corporate or down on weekends.',
    tags: ['2-in-1 Style', 'Top Knot', 'Executive Chic', 'Jet Black']
  },
  {
    id: 'style-04',
    name: '613 Platinum & Honey Mix Box Braids',
    category: 'Box Braids',
    image: '/images/style-04-613-ombre-blend.jpg',
    defaultSize: 'large',
    defaultLength: 'butt',
    defaultColor: '613',
    vibe: 'sleek',
    pricingMode: 'matrix',
    priceOffset: 0,
    rating: 4.8,
    reviewsCount: 29,
    badge: 'Color Blend',
    featured: false,
    saved: false,
    duration: '3.5 – 4 hrs',
    packs: '5 packs (#613 + #27 + #1B)',
    description: 'Custom hand-blended platinum #613, honey #27, and espresso #1B braids for a dimensional sun-lit statement.',
    tags: ['Hand Blended', '613 Blonde', 'Large Size', 'Quick Sit']
  },
  {
    id: 'style-02',
    name: 'Crystal Beaded Pigtail Bob Braids',
    category: 'Updos & Buns',
    image: '/images/style-02-beaded-pigtail-bob.jpg',
    defaultSize: 'medium',
    defaultLength: 'midback',
    defaultColor: '1B',
    vibe: 'updo',
    pricingMode: 'matrix',
    priceOffset: 0,
    rating: 4.9,
    reviewsCount: 31,
    badge: 'Crystal Beads',
    featured: false,
    saved: false,
    duration: '3.5 hrs',
    packs: '4 packs + Clear Beads',
    description: 'Playful double high-pigtail braids finished with sparkling clear crystal beads and sleek sculpted edges.',
    tags: ['Crystal Beads', 'Double Pony', 'Midback', 'Light & Chic']
  },
  {
    id: 'style-08',
    name: 'Long Sleek Passion & Rope Twists',
    category: 'Twists',
    image: '/images/style-08-long-rope-twists.jpg',
    defaultSize: 'medium',
    defaultLength: 'butt',
    defaultColor: '1B',
    vibe: 'sleek',
    pricingMode: 'matrix',
    priceOffset: 0,
    rating: 4.9,
    reviewsCount: 35,
    badge: 'Silk Rope',
    featured: false,
    saved: false,
    duration: '4 – 5 hrs',
    packs: '6 packs Twist Hair',
    description: 'Glossy waist-skimming two-strand twists with soft curled tips engineered never to unravel.',
    tags: ['Two-Strand', 'Curled Tips', 'Butt Length', 'Protective']
  },
  {
    id: 'style-09',
    name: 'Burgundy Maroon Havana Bob Twists',
    category: 'Twists',
    image: '/images/style-09-burgundy-bob-twists.jpg',
    defaultSize: 'jumbo',
    defaultLength: 'midback',
    defaultColor: '99J',
    vibe: 'locs',
    pricingMode: 'matrix',
    priceOffset: 0,
    rating: 4.8,
    reviewsCount: 27,
    badge: '2-Hr Express',
    featured: false,
    saved: false,
    duration: '2 – 2.5 hrs',
    packs: '4 packs Maroon (#99J)',
    description: 'Chunky, feather-light burgundy Havana twists cut into a flattering collarbone bob — our fastest express chair look.',
    tags: ['Jumbo P130', 'Wine #99J', 'Bob Cut', 'Express']
  },
  {
    id: 'style-10',
    name: 'Classic Sleek Senegalese Rope Twists',
    category: 'Twists',
    image: '/images/style-10-sleek-senegalese-twists.jpg',
    defaultSize: 'medium',
    defaultLength: 'midback',
    defaultColor: '1B',
    vibe: 'sleek',
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
    tags: ['Senegalese', 'Mirror Shine', 'Everyday Luxe', 'Edge Friendly']
  },
  {
    id: 'style-07',
    name: 'Jumbo Halo Crown Goddess Updo',
    category: 'Softdread & Switch',
    image: '/images/style-07-jumbo-crown-halo.jpg',
    defaultSize: 'jumbo',
    defaultLength: 'midback',
    defaultColor: '1B',
    vibe: 'updo',
    pricingMode: 'matrix',
    priceOffset: 0,
    rating: 4.8,
    reviewsCount: 24,
    badge: 'P130 Express',
    featured: false,
    saved: false,
    duration: '1.5 – 2 hrs',
    packs: '3 packs + Cuffs',
    description: 'Regal jumbo crown halo braid accented with silver cuffs — effortless bridal and weekend transformation in 90 minutes.',
    tags: ['P130 Gem', '90 Mins', 'Bridal & Gala', 'Crown Halo']
  },
  {
    id: 'style-16',
    name: 'Classic Jet-Black Midback Knotless',
    category: 'Box Braids',
    image: '/images/style-16-classic-midback-knotless.jpg',
    defaultSize: 'medium',
    defaultLength: 'midback',
    defaultColor: '1B',
    vibe: 'sleek',
    pricingMode: 'matrix',
    priceOffset: 0,
    rating: 5.0,
    reviewsCount: 58,
    badge: 'Parlour Icon',
    featured: false,
    saved: false,
    duration: '4 hrs',
    packs: '5 packs (#1B)',
    description: 'Full, glossy #1B medium braids dipped in hot water for feather-soft movement that suits every occasion.',
    tags: ['Jet Black #1B', 'Midback P180', 'Feather Soft', 'Classic']
  }
];

export const INITIAL_PROMOTIONS = [
  {
    id: 'promo-slay15',
    title: 'Ice-Crown Knotless Month-End',
    subtitle: '15% OFF all S-Medium & Small Knotless Braids + complimentary silk mousse finish.',
    discountPercent: 15,
    code: 'SLAY15',
    styleId: 'style-01',
    image: '/images/style-01-honey-curly-knotless.jpg',
    priceHighlight: 'From P170',
    originalPrice: 'P200',
    validUntil: '2026-12-15',
    theme: 'ice-pearl',
    active: true,
    badge: 'SIGNATURE CAMPAIGN',
    createdAt: '2026-11-27T08:00:00.000Z'
  },
  {
    id: 'promo-crown250',
    title: "Pick n' Drop & Softdread P250",
    subtitle: 'Official P250 flat rate across all lengths + free silver braid cuffs on weekday mornings.',
    discountPercent: 10,
    code: 'CROWN250',
    styleId: 'style-13',
    image: '/images/style-13-passion-curly-twists.jpg',
    priceHighlight: 'Flat P250',
    originalPrice: 'P280',
    validUntil: '2026-12-20',
    theme: 'obsidian-sapphire',
    active: true,
    badge: 'FLAT-RATE EXCLUSIVE',
    createdAt: '2026-11-27T09:00:00.000Z'
  },
  {
    id: 'promo-bestie',
    title: 'Bestie Duo Parlour Experience',
    subtitle: 'Reserve 2 chairs together with your bestie and enjoy 12% OFF both appointments.',
    discountPercent: 12,
    code: 'BESTIE12',
    styleId: 'style-14',
    image: '/images/style-14-burgundy-french-curl.jpg',
    priceHighlight: 'Save P80+ Duo',
    originalPrice: 'VIP Duo',
    validUntil: '2026-12-31',
    theme: 'editorial-sky',
    active: true,
    badge: 'DUO PRIVILEGE',
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
    hairColor: '#27 Honey Gold Blonde',
    stylistId: 'nicole',
    stylistName: 'Nicole',
    date: '2026-11-29',
    time: '09:00',
    addOns: ['Silk Detangle & Blowdry Prep'],
    promoCode: 'SLAY15',
    subtotal: 290,
    discount: 44,
    total: 246,
    deposit: 74,
    paymentMethod: 'Orange Money (72517904)',
    notes: 'Color #27 blended with #30 spiral tips please',
    status: 'Confirmed',
    createdAt: '2026-11-27T09:30:00.000Z'
  }
];

export const INITIAL_THREADS = [
  {
    id: 'thread-nicole',
    title: 'Nicole • Founder & Style Concierge',
    subtitle: 'Online now • Gaborone • +267 72 517 904',
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
        text: 'Dumelang & welcome to Nicole Beauty Parlour — Look Good, Feel Good, Be You! Send an inspiration photo, ask about braid packs or hair shades, or reserve your chair right from here.',
        timestamp: '08:30',
        status: 'read'
      },
      {
        id: 'm-2',
        sender: 'salon',
        senderName: 'Nicole',
        text: 'Official Parlour Rates: Knotless, Box Braids & Twists start at P130 (Jumbo Midback) up to P500 (Small Knee Length), and Pick n’ Drop / Softdread is flat P250. Apply code SLAY15 at checkout for 15% OFF today.',
        timestamp: '08:31',
        status: 'unread'
      }
    ]
  },
  {
    id: 'thread-promos',
    title: 'VIP Runway Drops & Offers',
    subtitle: 'Live campaign broadcasts & seasonal perks',
    avatar: '/images/style-14-burgundy-french-curl.jpg',
    online: true,
    pinned: false,
    unread: 0,
    role: 'VIP Channel',
    messages: [
      {
        id: 'm-p1',
        sender: 'salon',
        senderName: 'Nicole Promo Studio',
        text: 'ICE-CROWN MONTH-END: Enjoy 15% OFF S-Medium & Small Knotless Braids with code SLAY15. Tap any look in the Gallery to customize length & shade.',
        image: '/images/style-01-honey-curly-knotless.jpg',
        badge: 'CAMPAIGN • SLAY15',
        timestamp: '09:00',
        status: 'read'
      }
    ]
  },
  {
    id: 'thread-care',
    title: 'Hair Packs & Aftercare Lounge',
    subtitle: 'Shade matching, prep checklist & silk care',
    avatar: '/images/style-15-precision-knotless-grid.jpg',
    online: true,
    pinned: false,
    unread: 0,
    role: 'Care Guide',
    messages: [
      {
        id: 'm-c1',
        sender: 'salon',
        senderName: 'Nicky • Senior Stylist',
        text: 'Prep Tip: Arrive with freshly washed, product-free hair — or add our P40 Silk Detangle & Blowdry Prep when booking. Want us to source your braiding hair? Tick "Premium Braiding Packs Supplied (+P120)"!',
        timestamp: 'Yesterday',
        status: 'read'
      }
    ]
  }
];

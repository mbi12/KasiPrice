# Nicole Beauty Parlour 👑💙

**Look Good • Feel Good • Be You**  
Official Hair Braiding Marketplace, Online Booking, Live Salon Messaging & Promo Studio for **Nicole Beauty Parlour** (`@NICOLE_BEAUTY_PARLOUR` • `+267 72 517 904` • Gaborone, Botswana).

---

## ✨ Features

- **Animated Hairstyle Loading Screen**: Crown emblem, official Nicole Beauty Parlour logo, and gliding carousel of real salon hairstyles.
- **Salon Marketplace & Story Highlights**: 16+ real Nicole Beauty Parlour hairstyles with search, category filters, wishlist ♥ saving, and Instagram-style fullscreen story player.
- **Official BWP Price Calculator & Price Sheet Modal**: Exact Botswana Pula (`P130 – P500`) size × length pricing matrix (*Jumbo, Large, Medium, S-Medium, Small* × *Midback, Butt Length, Knee Length*) + *Pick n' Drop / Switch / Softdread* flat `P250`, plus the original salon price poster.
- **Interactive Booking Wizard & Digital Appointment Pass**: Select hairstyle, size, length, stylist, date/time, add-ons, promo code, and payment method (*Orange Money, MyZaka, Smega — 72517904*), with downloadable `.ics` calendar invite and 1-tap WhatsApp confirmation.
- **Real-Time Two-Way Salon Messaging**: Multi-thread inbox, photo & hairstyle card sharing, smart salon concierge auto-replies, **Client ⇄ Salon Owner Reply Mode** switcher, and direct WhatsApp sync.
- **Advertise & Add Hairstyle Studio**:
  - Upload new hairstyles directly from camera/gallery into the live marketplace.
  - Launch promotional ad campaigns with discount codes, live home banner carousel updates, VIP chat broadcasts, and a **Branded PNG Poster Flyer Generator** for WhatsApp Status & Instagram.
- **Android, Apple iOS & Google Play Store Ready**:
  - Full installable **PWA** (`manifest.webmanifest`, offline Service Worker, Apple iOS touch icons & standalone mode).
  - Native **Capacitor v8** `android/` and `ios/` projects (`com.nicolebeautyparlour.app`).
  - Automated **GitHub Actions workflow** (`.github/workflows/android-playstore.yml`) compiling both an installable `.apk` and a Google Play Store `.aab` release bundle.

---

## 🚀 Development & Testing

```bash
npm install
npm test
npm start
```

## 📱 Android APK, Google Play Store (`.aab`) & Apple iOS

```bash
# Sync web assets into native Android & iOS projects
npm run cap:sync

# Build installable Android APK locally
npm run android:apk

# Build Google Play Store Android App Bundle (.aab)
npm run android:playstore
```

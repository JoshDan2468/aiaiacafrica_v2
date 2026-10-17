# AIAIAC Africa 2027 — Frontend Asset & Content Management Guide

This document is the definitive operational reference for managing media assets, data registries, speakers, committees, company logos, country flags, event statistics, and page heroes across the AIAIAC Africa 2027 platform.

---

## 1. Directory Structure Overview

All static assets are located in `frontend/public/assets/aiaiac-2027/`:

```
frontend/public/assets/aiaiac-2027/
├── people/
│   ├── keynote/               # Current 2027 Keynote Speaker portrait
│   │   └── dr-james-makinde.webp
│   ├── chairman/              # Technical Committee Chairman portrait
│   │   └── dr-engr-gbenga-ayodele-owolabi.webp
│   ├── speakers/              # 25 Restored & future featured speaker portraits
│   │   ├── dr-kola-fagbayi.webp
│   │   ├── engr-audu-ibrahim.webp
│   │   └── ... (25 files)
│   ├── advisory-board/        # Advisory board members (12 files)
│   ├── organising-committee/  # Organising committee members (11 files)
│   └── technical-committees/  # Technical committees by track (43 files)
│       ├── artificial-intelligence/
│       ├── asset-integrity/
│       └── automation-cybersecurity/
├── logos/                     # Partner & corporate company logos
│   ├── phenomenal_energy_nigeria_limited_logo.jpg
│   ├── pan_ocean_oil_corporation_nigeria_limited_logo.jpg
│   └── ...
└── videos/                    # Conference hero video loops
    └── aiaiac-hero.mp4
```

---

## 2. Managing People (Speakers & Committee Members)

### File Paths
- **Current Keynote Speaker & Featured Speakers**: `frontend/src/data/speakers.ts`
- **Technical Chairman & Technical Committees**: `frontend/src/data/committee.ts`
- **Advisory Board Members**: `frontend/src/data/advisoryBoard.ts`
- **Organising Committee**: `frontend/src/data/organisingCommittee.ts`
- **Unified Speaker Directory Roster**: `frontend/src/data/speakersRoster.ts`

### Recommended Image Format & Dimensions
- **Format**: WebP (`.webp`)
- **Dimensions**: Maximum `480 × 480 px` (square aspect ratio, headshot centered vertically).
- **File size**: Typically 25 KB – 65 KB.
- **Rule**: Never link to external Framer or CDN image URLs. Always store locally in `frontend/public/assets/aiaiac-2027/people/...`.

### Example: Adding or Updating a Speaker
Edit `frontend/src/data/speakers.ts`:
```ts
{
  id: "dr-kola-fagbayi",
  name: "Dr. Kola Fagbayi",
  role: "Ex-Vice President",
  organisation: "British Petroleum",
  organisationKey: "bp",               // Links to organisations.ts registry
  countryCode: "NG",                   // 2-letter ISO code for SVG flag
  image: "/assets/aiaiac-2027/people/speakers/dr-kola-fagbayi.webp",
  track: "asset-integrity",
}
```

> [!IMPORTANT]
> **Keynote Speaker Separation**:
> The 2027 Keynote Speaker (`Dr. James Makinde`) is strictly separated from archive/previous edition speakers. He must never be placed inside the `previousEditionSpeakers` list.

---

## 3. Company Logos Registry

### File Path
`frontend/src/data/organisations.ts`

### Aspect Ratios & Automatic Sizing
The component `<CompanyLogoBadge />` automatically handles two logo formats:
1. **`square`**: Crests, badges, or circular marks (1:1 ratio). Rendered as an elegant `34–38px` circular badge.
2. **`wide`**: Horizontal wordmarks (1.5:1 to 3.5:1 ratio). Rendered as a rounded pill (`56–62px × 32–34px`).

### Example: Registering a Logo
```ts
export const organisations: Record<string, Organisation> = {
  seplat: {
    name: "Seplat Energy",
    logo: "/assets/aiaiac-2027/logos/1630538037825.jpg",
    aspect: "square",
  },
  renaissance: {
    name: "Renaissance Africa Energy Company",
    logo: "/assets/aiaiac-2027/logos/xT5NgohX7gIhq4zto9Q8gdUfupw2mq8ETVN96afC-1.jpg",
    aspect: "wide",
  },
  anoh: {
    name: "ANOH Gas Processing Company Limited",
    // When the official ANOH logo image is provided:
    // logo: "/assets/aiaiac-2027/logos/anoh-gas.png",
    aspect: "wide",
  },
};
```
If no logo image is configured, `<CompanyLogoBadge />` falls back gracefully to clean typography without breaking the card layout.

---

## 4. Country Flags & Badges

### File Path
`frontend/src/components/common/CountryFlag.tsx`

### Usage
Country flags are rendered via `<CountryBadge code="NG" />` or `<CountryFlag code="NG" />`.

Supported ISO codes with inline SVG flags include:
- `NG` — Nigeria
- `GH` — Ghana
- `TZ` — Tanzania
- `AE` — United Arab Emirates
- `SA` — Saudi Arabia
- `NL` — Netherlands
- `MY` — Malaysia
- `AO` — Angola
- `US` — United States
- `CA` — Canada

> [!WARNING]
> Never use `"NA"` as an abbreviation for "Not Available". In ISO-3166, `"NA"` represents Namibia. If a person's country is unconfirmed, set `countryCode: undefined`.

---

## 5. Event Statistics Band

### File Path
`frontend/src/data/eventStats.ts`

### Configuration
```ts
export const eventStats: EventStatItem[] = [
  {
    id: "confirmed-speakers",
    value: 25,
    suffix: "+",
    label: "Confirmed Speakers & Technical Authorities",
    confirmed: true,
  },
  {
    id: "technical-tracks",
    value: 4,
    suffix: "",
    label: "Dedicated Conference Tracks",
    confirmed: true,
  },
  {
    id: "event-days",
    value: 2,
    suffix: "",
    label: "Days of Strategic & Technical Exchange",
    confirmed: true,
  },
  {
    id: "attendees-projection",
    value: null,
    suffix: "+",
    label: "Industry Delegates Projected",
    confirmed: false, // Hidden until officially locked
  },
];
```
Only items with `confirmed: true` are displayed in the homepage count-up band. If an item is unconfirmed, setting `confirmed: false` cleanly suppresses it without guessing figures.

---

## 6. Dynamic Page Hero System

### File Path
`frontend/src/components/layout/DynamicPageHero.tsx`

The platform uses two background modes:
1. **Mode 1 (`video`)**: High-impact looping background video with dark green gradient overlay. Used on Homepage, Conferences, and Media.
   ```tsx
   <DynamicHeroBackground mode="video" poster={heroPoster} />
   ```
2. **Mode 2 (`ambient`)**: Slow 24-second CSS radial gradient shifts across `#05190F`, `#0B2A1D`, and `#173D2D` with muted sage accents. Used on About, Speakers, Sponsorship, Contact, and Registration.
   ```tsx
   <DynamicHeroBackground mode="ambient" />
   ```
- Fully respects `prefers-reduced-motion` (instantly freezes into a stationary brand gradient).
- Zero artificial AI patterns, circuit lines, or dotted grids.

---

## 7. Global Button Standards

### File Path
`frontend/src/components/common/ActionButton.tsx`

Buttons adhere to the following design system rules:
- **Border radius**: `12–14px` (`rounded-xl` or `rounded-[13px]`).
- **Standard height**: `50px` for medium buttons (`md`), `54px` for prominent form and hero buttons (`lg`).
- **Primary action**: `#CFEA3B` background, `#102C20` text, bold font.
- **Secondary action**: `#173D2D` background, `#F7F5EF` text.
- **Outline action**: Transparent with contextual `border-white/25`.

---

## 8. WhatsApp Commercial Desk Routing

### File Path
`frontend/src/data/eventContactConfig.ts`

To change the commercial desk phone number, default greeting, or route specific enquiry contexts:
```ts
export const EVENT_CONTACT = {
  phone: "+234...",
  whatsappNumber: "234...",
  commercialDesk: { ... },
};
```
Use `getWhatsAppEnquiryUrl("SPONSORSHIP")` or `getWhatsAppEnquiryUrl("EXHIBITOR")` to generate pre-filled WhatsApp links.

---

## 9. Sponsorship Tiers & Packages

### File Paths
- **Data**: `frontend/src/data/brochure.ts`
- **Card Component**: `frontend/src/components/sponsorship/SponsorshipTierCard.tsx`
- **Section Layout**: `frontend/src/pages/public/sponsorship/SponsorshipPackagesSection.tsx`

Each tier card renders on warm ivory `#F6F2E8` with asymmetric top-right curvature (`28–34px`), olive green checkmarks (`#80954B`), and a fit-content `#173D2D` enquiry button.


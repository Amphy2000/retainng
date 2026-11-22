# RetainNG — Customer Retention SaaS for Nigerian SMEs

A mobile-first customer retention platform for small and medium-sized businesses in Nigeria — salons, barbers, laundries, car washes, boutiques, and more.

**Live demo:** [Deploy to Vercel](#deployment)

---

## What It Does

RetainNG helps Nigerian SMEs:
- **Keep customer records** — name, phone, tags, visit history, consent status
- **Track repeat visits** — record a sale or visit in under 10 seconds on mobile
- **Understand customer behaviour** — repeat rate, lapsed customers, frequent visitors
- **Follow up ethically** — only message customers who have explicitly opted in
- **Share a QR opt-in** — customers self-register and consent at the counter

---

## MVP Features

| Feature | Status |
|---|---|
| Business account & onboarding checklist | ✅ |
| Customer database (add, edit, search, tags, consent) | ✅ |
| Quick sale / visit recording (mobile-first, 10 sec flow) | ✅ |
| 1-Tap Rapid Counter — recent customer bubbles | ✅ |
| Fast Walk-in button | ✅ |
| Daily Shift & Commission Tally modal | ✅ |
| Customer segments (lapsed, frequent, unvisited, all) | ✅ |
| Campaign preparation with live consent audit | ✅ |
| Customer self-registration opt-in form + QR code | ✅ |
| Printable Counter Stand card | ✅ |
| CSV import with column mapping & duplicate detection | ✅ |
| Simple dashboard (honest metrics, clearly labelled) | ✅ |
| PWA manifest (installable on phone home screen) | ✅ |
| Demo / sample data for onboarding | ✅ |
| Supabase auth + PostgreSQL (multi-tenant RLS schema) | ⚙️ Schema ready, wiring pending |
| Real SMS / WhatsApp gateway | 🔜 Post-MVP |

---

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Styling:** Tailwind CSS v4
- **Database:** Supabase (PostgreSQL) + Row Level Security
- **Auth:** Supabase Auth (schema ready; MVP runs on localStorage)
- **Icons:** Lucide React
- **QR generation:** `qrcode`
- **CSV parsing:** `papaparse`

---

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/Amphy2000/retainng.git
cd retainng
npm install
```

### 2. Environment variables

Create a `.env.local` file (copy from `.env.example`):

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

> **Note:** Without these, the app runs in **localStorage demo mode** — fully functional for testing, but data is local to the browser and not shared across devices.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Demo data loads automatically.

### 4. Database migrations (optional — requires Supabase)

```bash
# Apply schema and RLS policies
supabase db push
# Or run manually in Supabase SQL editor:
# supabase/migrations/20261121_initial_schema.sql
```

---

## Deployment

### Deploy to Vercel (recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Amphy2000/retainng)

1. Click the button above or import the repo in [vercel.com/new](https://vercel.com/new)
2. Add your Supabase environment variables in the Vercel dashboard
3. Deploy — it will auto-detect Next.js

### Environment Variables for Vercel

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon (public) key |

> Without these, the deployed app runs in localStorage demo mode — perfect for previewing or showing to potential users.

---

## Product Principles

1. **Easy to adopt** — account creation to first sale in under 2 minutes
2. **Low effort** — recording a visit takes 10 seconds on a phone
3. **Works with existing workflows** — no POS or accounting software required
4. **Honest automation** — never claims to know about sales made outside the app
5. **Consent-first** — storing a phone number ≠ marketing consent
6. **Mobile-first** — designed for business owners working on their phones
7. **Simple language** — no CRM jargon, no overwhelming dashboards

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Dashboard
│   ├── customers/          # Customer directory
│   ├── sales/              # Sales ledger
│   ├── segments/           # Customer segments
│   ├── campaigns/          # Campaign preparation
│   ├── settings/           # Business settings
│   └── opt-in/[slug]/      # Public customer opt-in form
├── components/             # Reusable UI components
│   ├── RecordSaleModal.tsx # Quick sale / visit recording
│   ├── CustomerDetailModal.tsx
│   ├── DailyShiftModal.tsx # Shift tally & commission split
│   ├── QrCodeModal.tsx     # QR + printable counter stand
│   ├── CsvImportModal.tsx
│   └── ...
├── context/AppContext.tsx  # Global state
├── lib/
│   ├── storage.ts          # localStorage CRUD (demo mode)
│   ├── seedData.ts         # Demo business & customer data
│   └── utils.ts            # NGN formatting, date helpers
└── types/index.ts          # TypeScript type definitions
supabase/
├── migrations/             # PostgreSQL schema + RLS policies
└── seed.sql                # Demo seed data for Supabase
```

---

## Consent & Data Ethics

- A customer's phone number in the database does **not** mean they have marketing consent
- Consent is only recorded when: (a) a customer ticks the opt-in checkbox on the self-registration form, or (b) a staff member explicitly checks the consent box when adding a new customer manually
- The campaign preparation screen shows an **excluded contacts** tab — customers without consent can never be sent a campaign
- All consent records log the source (`qr_optin`, `manual_staff`) and timestamp

---

## What's Not Built Yet (Post-MVP)

- Real SMS delivery (Termii / Africa's Talking integration)
- WhatsApp Cloud API messaging
- Supabase authentication UI (sign up / sign in screens)
- Subscription / billing
- POS hardware integration
- Loyalty points

---

## License

MIT

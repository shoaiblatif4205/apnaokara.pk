# Apna Okara — Local Marketplace (Okara & Sahiwal)

> A local classifieds + services + business directory platform built **only** for Okara, Sahiwal and nearby areas.
> Bilingual (Urdu / English), paid listings with manual payment verification, auto-expiring ads, and a full admin panel that keeps every record forever.

**Domain:** `apnaokara.pk`
**Platforms:** Website (Urdu/English) + Android & iOS app
**Status:** All 10 phases built and tested locally. Next: go live (Supabase cloud, Vercel, domain, Expo account), see "Before going live" notes below.
**Last updated:** 19 Nov 2026

### Confirmed decisions

| Topic | Decision |
|---|---|
| Models | All 6 models |
| Areas | Okara, Sahiwal **and Pakpattan** districts |
| Durations | 7, 10, 15, 20, 25, 30 days |
| Featured | +Rs 200 |
| WhatsApp Group Boost | +Rs 200 (same as Featured) |
| Seller login | **No login.** Seller manages an ad with Reference Number + phone number |
| Free listings | **Fully controlled by admin** from the admin panel (on/off, how many days, which categories, per-ad) |
| Logo & brand | Simple logo and colours to be designed by us |
| Scope | **Everything is built now.** Complete website + complete mobile app together, no features left for later |
| Mobile app | Android + iOS, built **alongside** the website on the same backend |
| Rishta section | Yes, private section with login, profile fee Rs 1,000, mutual-interest contact, female coordinator, overseas families allowed, caste field included (Section 22) |
| Payment account details | Later |
| Contact details | Later |
| About Us content | Owner will provide |

### Project structure

```
Apna Okara/
├── apps/web/            Next.js website (+ admin panel from Phase 2), Urdu/English
├── apps/mobile/         Expo app (Android + iOS)
├── packages/shared/     Categories, cities, prices, brand, Urdu/English text, types
├── supabase/migrations/ Database tables, security rules, auto-expiry
├── scripts/             generate-seed.ts → supabase/seed.sql
└── brand/               Logo, Urdu logo, app icon, colours
```

### Phase 1 status

| Item | Status |
|---|---|
| Node.js 26 and Git installed on this computer | Done |
| Monorepo (web + mobile + shared), packages installed | Done |
| Shared data: 6 models, 15 categories with sub-categories and fields, 11 cities, prices | Done |
| Database schema: all tables incl. banners, blog, rishta; RLS; auto-expiry function | Done |
| Seed generated: `supabase/seed.sql` (categories, cities, prices, settings, pages, storage buckets) | Done |
| Website: Urdu (RTL) / English, header, category menu, footer, home skeleton, SEO basics | Done: type check + production build pass, checked in browser (desktop + mobile, both languages) |
| Mobile app: tabs (Home, Search, Post Ad, My Ads, Menu), Urdu/English, home skeleton | Done: type check pass, Android bundle builds. Not yet run on a phone |
| Logo, Urdu logo, app icon, splash, FB cover, OG share image | Done (`npm run images`) |
| Local database: PostgreSQL 17 on this computer, schema + seed loaded, Urdu (UTF-8) verified | Done |
| Supabase cloud, domain `apnaokara.pk`, Vercel hosting, Expo account | **At the very end**, after every feature works locally |
| Okara localities list | Starting list; owner to review. Other cities: add from admin |

### Phase 2 status (Admin Panel)

| Item | Status |
|---|---|
| Admin login (email + password, 7-day session, 5 wrong tries = 15 min lock) | Done, tested |
| Roles: Super Admin, Moderator, Blog Writer, Rishta Coordinator; menu shows only allowed pages | Done |
| Activity log (every change: who, what, when) with search | Done, tested |
| Dashboard (ad counts, revenue this month, Free Mode status) | Done (numbers fill from Phase 3) |
| Categories manager: edit names/icon/order/SEO, on/off, show on home, sub-categories, ad form fields | Done, tested |
| Locations manager: cities and mohallas, on/off, add new | Done, tested |
| Site settings: contact, social links, payment accounts, offer bar, app links (with link/email checks) | Done, tested |
| Free listings: ON/OFF, start/end dates, days per model, only some categories, limit per phone, banner text | Done, tested |
| Admin users: add, change role, reset password, turn off (always at least one Super Admin) | Done |

**Admin panel:** http://localhost:3000/admin (database must be running: `npm run db:start`).
First Super Admin: `npm run admin:create`; login details are written to `apps/web/.env.local` (`LOCAL_ADMIN_EMAIL` / `LOCAL_ADMIN_PASSWORD`).
Note: the public website still reads categories and cities from `packages/shared`; it switches to the database (so admin changes show on the site) in Phase 4.

### Phase 3 status (Post an Ad)

| Item | Status |
|---|---|
| API for website + app: `GET /api/v1/meta`, `POST /api/v1/listings`, `POST /api/v1/my-ads` | Done, tested |
| Website Post Ad form: 5 steps (category → details + category fields → photos → contact → plan/payment), Urdu + English | Done, tested in browser |
| Free Mode: payment step skipped, free days from admin, limit per phone | Done, tested |
| Paid ads: price from Pricing table (category override or default), JazzCash/Easypaisa/Bank, Transaction ID, screenshot | Done, tested (Rs 300 for 15 days) |
| Server checks: phone, fields, year, duration, photo count, real images only, blocked numbers, 10 ads/hour per connection | Done, tested |
| Photos: checked, rotated, resized to 1600px, saved as WebP | Done |
| Reference number (`AO-10001`…) + share on WhatsApp + saved on the device | Done |
| My Ad page (`/my-ad`): status, reject reason, expiry, mark sold, renew (free or paid), request a change | Done, tested in Urdu |
| Admin Listings manager: tabs with counts, search by reference / phone / title, filter by model | Done, tested |
| Admin ad page: approve, reject (reason), remove, extend days, make live again, give free, mark sold, edit text/price, block number, copy WhatsApp post, photos, payment screenshot, duplicate Transaction ID warning, full history | Done, tested |
| Auto-expiry: hourly in local dev (`src/instrumentation-node.ts`) and when admin/meta is used; pg_cron on Supabase | Done, tested |
| App: Post Ad (gallery + camera, photo shrinking), My Ads (saved ads, status, sold, renew, change request) | Done: type check + Android bundle pass. **Not yet run on a phone** |

**Photos and screenshots** are saved in `.local/uploads` (not committed). Payment screenshots are only visible to logged-in admins.
**Test the app on a phone:** put your computer's Wi-Fi address in `apps/mobile/.env` as `EXPO_PUBLIC_API_URL=http://<ip>:3000`, run `npm run dev:web` and `npm run dev:mobile`, then scan the QR code with Expo Go.
### Phase 4 status (Home, category pages, browsing)

| Item | Status |
|---|---|
| Website reads categories, cities, footer and menu from the database (admin changes show at once) | Done |
| Home page: hero (our slide + brand/house slides) + 2 side banners, trust points, categories with ad counts, featured, wide banner, fresh ads (sponsored card every 8), seasonal, service providers, popular in city, latest jobs, businesses, how it works, cities, brands, community + app, blog (placeholder), FAQ (+ FAQ schema), SEO text | Done, tested |
| Section order, on/off and titles from admin; free-listings banner and offer bar under the header | Done, tested |
| Category pages: `/mobiles`, `/mobiles/okara`, `/mobiles/mobile-phones`, `/mobiles/mobile-phones/okara` with category-specific filters, sort, pagination, related category/city links | Done, tested |
| City pages `/city/okara`, search `/search?q=`, all categories `/categories`, saved ads `/saved` | Done, tested |
| Ad page `/ad/<title>-AO-10001`: gallery, price, details, description, WhatsApp (pre-filled message), show number, save, share, report, safety tips, similar ads, expired/sold notice, view counter; wrong links redirect to the right one | Done, tested |
| SEO basics on these pages: titles, descriptions, canonical + Urdu/English alternates, BreadcrumbList, Product / JobPosting / LocalBusiness schema, search pages noindex | Done |
| Admin: Homepage manager (sections, our banners and hero slides with images, dates, clicks) and Reports (open / handled) | Done, tested |
| Banner click counting (`/api/v1/banners/<id>/click`) | Done |
| App: Home with real ads, Search (category, city, sort, featured, load more), Ad screen (gallery, details, WhatsApp, call, save, share, report, similar), Saved ads | Done: type check + Android bundle pass. **Not yet run on a phone** |

### Phase 5 status (Services, Businesses, Ratings)

| Item | Status |
|---|---|
| Service providers and businesses list at `/services`, `/services/plumber/okara`, `/business` (category pages with Verified filter) | Done |
| Profile page (same `/ad/<name>-AO-…` address): Verified badge, stars, experience, areas served, timings, address, Google Maps, website, starting rate, gallery, contact | Done, tested |
| Ratings and reviews: 1–5 stars + comment, name, phone (never public). One review per phone per provider, provider cannot review self, live providers only, 5 reviews/hour per connection | Done, tested |
| Rating average and count kept up to date automatically in the database (hidden reviews do not count) | Done, tested |
| Provider replies to reviews from **My Ad** (reference + phone), on website and app | Done, tested |
| Admin: Reviews page (All / 1–2 stars / Hidden), hide with reason, show again, remove a rude reply, reviews and reports on each ad page | Done, tested |
| Admin: Give / remove **Verified** badge (recorded in history and activity log) | Done, tested |
| SEO: LocalBusiness schema with address, opening hours and AggregateRating; titles show category and rating | Done |
| App: rating, Verified, reviews list and “write a review” on the ad screen; replies in My Ads | Done: type check + Android bundle pass. **Not yet run on a phone** |
| Database changes since Phase 1 now go in new files in `supabase/migrations/`; run `npm run db:migrate` (keeps your data) | Done |

Note: README Section 8 planned separate `/services/<name>` profile addresses; those paths are already used by sub-category pages (`/services/plumber`), so profiles use the ad address.

### Phase 6 status (Payments, Pricing, Banner Ads)

| Item | Status |
|---|---|
| Featured (+Rs 200) and WhatsApp Boost (+Rs 200) when posting; also allowed during Free Mode (then only the add-ons are paid) | Done, tested |
| Total always calculated on the server (`/api/v1/quote`): plan + add-ons − promo | Done, tested (15 days + both add-ons = Rs 700, with 50% code = Rs 350) |
| Promo codes: % or Rs off, start/end dates, max uses, max per phone, which purposes; every use recorded | Done, tested |
| Featured turns on when the ad is approved and lasts until the ad ends; Boost goes to the WhatsApp Boost queue | Done, tested |
| Upgrade a live ad to Featured / Boost from **My Ad** (website and app), verified in Payments | Done, tested |
| Admin **Pricing**: default prices per model and days, category prices, add-on prices, banner prices, design service price, popup on/off | Done |
| Admin **Payments**: Pending / Verified / Rejected / Free / All, filters (type, method, dates, search), totals, duplicate TID warning, screenshot, verify & switch on, reject; **Excel (CSV) download** | Done, tested |
| Admin **Promo codes**, **Blocked numbers**, **WhatsApp Boost queue** (copy post, mark done) | Done, tested |
| Dashboard: to-do list (pending ads, payments, banners, boosts, reports) and money received in the last 14 days | Done |
| **Advertise With Us** page (`/advertise`): places, sizes and prices; booking form with dates, link, cities, categories, website/app, image or design service, promo, payment | Done, tested |
| Banner views and clicks counted per day; private **brand stats link** (`/banner-stats/<code>`) | Done, tested |
| Admin **Banner Manager**: Pending / Scheduled / Running / Paused / Expired / Rejected, approve (paid or free), reject, pause, resume, extend, edit dates/targeting/link/images, create a banner booked by phone | Done, tested |
| App: add-ons, promo code and server total when posting; upgrade in My Ads | Done: type check + Android bundle pass. **Not yet run on a phone** |

### Phase 7 status (Rishta)

| Item | Status |
|---|---|
| Login with phone + 6-digit code (OTP): codes stored hashed, 10 minutes, 5 tries, 3 codes per 10 min; 30-day session (cookie on website, secure token in app) | Done, tested. **Locally the code is shown on screen; on the live site an SMS / WhatsApp provider must be connected** |
| Profiles: made by self / parent / sibling / relative; all fields from Section 22 incl. caste, sect, native area + current city/country (overseas), family, looking for; 18+ check; phone numbers and links removed from text automatically; up to 5 profiles per account | Done, tested |
| Fee Rs 1,000 / 90 days (admin can change), optional Premium, promo codes, Rishta Free Mode (separate from ads), renew | Done |
| Photos: up to 5; original kept private; members see a blurred + watermarked copy; clear (watermarked) only after mutual yes **and** the family chooses to share; admin approves every photo | Done, tested |
| Search (members with an approved profile only): age, native city, country, education, caste, sect, marital status, with photo; opposite gender by default; Premium first | Done, tested |
| Profile view without name / phone / address; send interest (daily limit), accept, accept and share photos, decline, withdraw, share / stop sharing photos, ask coordinator, block, report | Done, tested |
| Guardian name and phone shown only to both families after mutual acceptance | Done, tested |
| Pages: `/rishta` (only indexed page), login, my profiles, profile form with photos, search, `/rishta/R-1001`, interests, rules, success stories. All member pages noindex and need login | Done, tested in Urdu + English |
| Admin **Rishta**: tabs, girls first for the Rishta Coordinator, private contact for the verification call, approve (paid / free), reject / hide / remove with reason, extend, Premium, photo approval, block account, payments, interests, reports; **Requests** (coordinator help, reports); **Success stories**; Rishta prices in Pricing | Done, tested |
| App: Rishta from Menu: phone + code login, search, interests, my profiles, profile view with interest actions; **screenshots blocked** on Rishta screens; profile form and photo upload open the website | Done: type check + Android bundle pass. **Not yet run on a phone** |

**Rishta update (Phase 8 start):** `/rishta/signup` page; Rishta menu shows Login + Sign up (logged out) or Search, Interests, My profiles (logged in); **Recently joined** cards on `/rishta` and a Rishta section on the home page (ID, age, city, education only: no name, phone, caste or photo; admin can turn it off in Pricing → Rishta).

### Phase 8 status (Pages & Blog)

| Item | Status |
|---|---|
| Info pages in Urdu + English: `/about`, `/contact`, `/how-it-works`, `/faq`, `/pricing`, `/safety`, `/community`, `/download` | Done, tested |
| Legal pages: `/terms`, `/privacy`, `/posting-rules`, `/refund-policy`, `/disclaimer` | Done, tested. **Starting text only: owner should review before launch** |
| Starting text for every page (`apps/web/src/lib/defaultPages.ts`) until the owner writes their own in Admin → Pages; "On this page" contents, last-updated date, breadcrumbs | Done |
| FAQ page from `### Question` headings + FAQPage schema; Pricing page reads live prices (ads, 2-month plans, add-ons, Rishta, banners, Free Mode notice) | Done, tested |
| Contact page: contact details from Site settings + message form (`POST /api/v1/contact`, spam trap, 5 per hour) → Admin **Messages** (New / Replied / Closed, WhatsApp / call / email links) | Done, tested |
| Blog: `/blog` (categories, pages), `/blog/category/<slug>`, `/blog/tag/<slug>` (noindex), `/blog/<slug>`: cover, author, date, reading time, contents, FAQ, tags, related posts, related ads, "read in other language", BlogPosting + FAQPage schema, hreflang between Urdu and English versions | Done, tested |
| Safe text: pages and posts are written in Markdown; HTML and `javascript:` links are removed | Done, tested |
| Home page: latest 3 posts (placeholder until the first post) | Done, tested |
| Admin **Pages**: edit title + text in English and Urdu, SEO title / description, Visible / Hidden | Done, tested |
| Admin **Blog**: list with filters, new / edit (language, address, summary, text, cover picture, category, author, tags, ads category, link to other-language version, FAQ, SEO, noindex, draft / publish / schedule / archive), delete (Super Admin); **Categories and authors** page. Blog Writer role can use Pages and Blog | Done, tested |
| App: native Blog list (categories, pull to refresh) from `GET /api/v1/blog`; posts and info pages open on the website | Done: type check + Android bundle pass. **Not yet run on a phone** |

### Phase 9 status (SEO, AEO & GEO)

| Item | Status |
|---|---|
| Fixed: the layout gave every page the home page as canonical; now only pages that set their own canonical have one (search, saved, member pages are noindex) | Done, tested |
| Title templates (category, category + city, city, ad, service / business) in Urdu and English, editable in Admin → SEO; meta descriptions with price, city and live ad counts | Done, tested |
| Organization + WebSite (search box) structured data on every page, with contact and social links from Site settings | Done, tested |
| Listing structured data: Product (brand, condition, seller), Car / Vehicle (make, model, year, km, fuel), RealEstateListing (area, rooms), JobPosting, LocalBusiness, BlogPosting, FAQPage, BreadcrumbList | Done, tested |
| Share cards (Open Graph / Twitter) on every page: ad photo on ads, cover on posts, site image elsewhere | Done |
| `robots.txt` (dynamic): private areas always blocked, Rishta profiles blocked, AI crawlers allow / block switch, extra blocked addresses; test copies (Vercel preview or `SEO_BLOCK_ALL=1`) block everything | Done, tested |
| Split sitemaps: `/sitemap.xml` → pages, categories (incl. category × city pages that have ads), blog, listings (10,000 ads per file, with photo), Urdu + English alternates; expired / sold ads and Rishta never listed | Done, tested |
| Category × city pages with no live ads are noindex (setting in Admin → SEO) | Done, tested |
| `llms.txt` for AI tools: what Apna Okara is, areas, live ad count, prices, how it works, categories, cities, latest articles, plus your own text | Done, tested |
| AEO: FAQ blocks with answers from live data (ad count, price range, typical price, verified providers) on category, category + city and city pages, with FAQPage data; "Quick answer" box on blog posts | Done, tested |
| Redirects (old address → new, 301 / 302) managed in Admin → SEO | Done, tested (also on the production server) |
| Google Search Console + Bing verification codes, Google Analytics 4 (live site only) | Done, tested |
| PWA: web app manifest (install to home screen, shortcuts); image alt text includes title + city | Done |
| App store listing text (name, descriptions, keywords, screenshot captions in Urdu and English): `apps/mobile/store-listing.md` | Done |
| Core Web Vitals (speed) | Fonts swap, images lazy-load and are WebP; **real speed test (PageSpeed) only after going live** |

### Phase 10 status (Notifications, Growth & Extras)

| Item | Status |
|---|---|
| App push notifications (Expo): ad approved / rejected, ad ending soon (48 hours before, once), new ads in a followed category + city (at most once every 6 hours), Rishta interest received / accepted (no names or details in the message). Urdu or English by the phone's language | Done, tested (test mode) |
| Every push is written to an outbox first (no duplicates, kept as a record), then sent; dead phones are switched off automatically | Done, tested |
| App: "Tell me when my ad is live" after posting, bell on Search to follow a category + city, Menu → Notifications (switches + followed searches), tapping a notification opens the right screen | Done: type check + Android bundle pass. **Needs a real phone + Expo account to receive pushes** |
| Admin **App notifications**: phones count, last 30 days by type, recent messages, send a message to all / Urdu / English users, settings | Done, tested |
| Admin **Expiry reminders**: ads ending in 3 days / ended in last 7 days, one-click WhatsApp message with the seller's renew link (recorded) | Done, tested |
| **Referrals**: every seller gets a code in My Ad + "Invite on WhatsApp" link (`/post-ad?ref=CODE`); only brand-new numbers count, only after their first ad is approved, no self-referral; after 5 (admin can change) a one-time gift code worth a free 7-day ad, locked to the referrer's phone | Done, tested |
| Admin **Referrals**: on/off, friends needed, free ad length, top inviters, mark fake referrals "not counted", gift codes given | Done |
| **WhatsApp community**: "Join WhatsApp group" after posting an ad (website), community page, footer links | Done |
| Admin **QR posters**: QR for any page / category / city / WhatsApp group, Urdu or English A4 poster (print), PNG and SVG download, `?source=qr-<place>` to see which poster works | Done, tested |
| Admin **Daily WhatsApp post**: top new ads (featured first) as ready text for WhatsApp and Facebook, by time / city / type, with copy and open-WhatsApp buttons | Done, tested |
| **Daily backup** (after 2 am, last 14 kept) of the whole database into private storage; Admin **Backups & export**: back up now, download (Super Admin only), restore guide; `scripts/restore-backup.mjs` | Done, tested (restored into a separate database: all counts match, Urdu kept, numbering continues) |
| **Export any table** to Excel/CSV (passwords, login codes and push tokens never included; every download logged) | Done, tested |
| **Dashboard**: 7 / 30 / 90 days, to-do list (pending ads, payments, banners, boosts, reports, messages, reminders, Rishta), tiles with change vs previous period, new ads and money per day charts, live ads by category and city, most viewed ads, money by type, payments by method, growth tools. Money only for the Super Admin | Done, tested |
| Hourly jobs (expiry, ending-soon pushes, sending, daily backup): locally in the dev server; live site: `/api/cron` with `CRON_SECRET` (`apps/web/vercel.json`) | Done, tested |

**Before going live (Phase 10):**
- Expo account: run `eas init` in `apps/mobile` (adds the project id the app needs for push), then set `PUSH_SEND=1` on Vercel (and optionally `EXPO_ACCESS_TOKEN`). Until then pushes are only recorded as "dry run".
- Vercel: add `CRON_SECRET` (a long random text). `vercel.json` runs the jobs once a day at 02:05 Pakistan time (works on the free plan). On Vercel Pro it can be hourly.
- Backups go to the private "backups" storage bucket. Also turn on Supabase's own daily backups, and download a copy to Google Drive / USB every week.
- Add the WhatsApp group / channel links in Site settings (used after posting, on posters and in the daily post).

### Security review before launch (Nov 2026)

| Area | What was done | Tested |
|---|---|---|
| Hacking through ads (XSS) | All page data (structured data, breadcrumbs) escaped; Markdown strips HTML and unsafe links; strict browser security headers (CSP, no framing, HTTPS only, camera/location off) | Script in an ad title does not run |
| Data theft | No public database access at all (Row Level Security on every table, all public read rules removed); private files never served to the public; backups and table export Super Admin only | Public API role reads nothing; screenshots, Rishta originals, backups refused |
| Rishta (girls' profiles) | Original photos only through the protected photo route (blur / watermark / family consent); contact only after both say yes; max 60 new profiles a day per member (150 Premium) to stop copying; member pages noindex | 20 Rishta privacy checks + daily limit test |
| Admin accounts | Login tokens only valid for their purpose; 5 wrong passwords per email (20 per connection) = 15 min lock, stored in the database; same answer time for unknown emails | Lock shown after 5 wrong tries |
| Sellers (no login) | Secret 8-letter code given after posting (only its hash stored); needed to mark sold and reply to reviews | Stranger with reference + phone refused |
| Fake payments | Same transaction ID can never be used twice (database rule); same screenshot refused; fake-looking IDs refused; checklist on the Payments page: always confirm in your own JazzCash / Easypaisa / NayaPay app | All three refused |
| Software | Next.js 14 → 15.5.29 (critical fixes), sharp 0.35.5 (photo processing), zod 4.6.7; built-in image optimizer off | Type check, production build, Android bundle |

Test scripts (local only): `.local/test-security.mjs`, `.local/test-rishta.mjs`, `.local/test-reviews.mjs`, `.local/test-phase6.mjs`, `.local/test-phase10.mjs`.

**Payment accounts (Site settings):** JazzCash, Easypaisa and NayaPay 0307 2849373, title Shagufta Latif. Bank account: not added yet.

### Go-live checklist (what the owner provides)

| # | Needed | Why |
|---|---|---|
| 1 | GitHub account (repository access) | Code is stored there; Vercel builds from it |
| 2 | Vercel account (Pro plan recommended) | Hosts the website; Pro allows the hourly jobs (free plan: once a day) |
| 3 | Supabase account + new project (Mumbai or Singapore region) | Database and photo storage |
| 4 | Domain apnaokara.pk login (PKNIC / reseller) | Point the domain to Vercel |
| 5 | Expo account | Build the Android / iPhone app and send notifications |
| 6 | Google Play developer account (USD 25 once) | Publish the Android app |
| 7 | Apple developer account (USD 99 / year), optional | Publish the iPhone app |
| 8 | SMS / WhatsApp OTP provider (e.g. Twilio, a Pakistani SMS gateway, or WhatsApp Business API) | Rishta login codes on the live site |
| 9 | Google account with access to apnaokarapk@gmail.com | Search Console, Analytics, Business Profile |
| 10 | Social links: Facebook page, WhatsApp group, WhatsApp channel, Instagram, YouTube | Footer, Community page, posters, daily post |
| 11 | A strong admin password for the first Super Admin (owner types it in) | Admin panel login |
| 12 | Optional: bank account details | Bank transfer option |

**After going live (SEO):** add the site to Google Search Console and Bing, paste the codes in Admin → SEO, submit `https://apnaokara.pk/sitemap.xml`, add the Analytics ID, and create the Google Business Profile with the same name, phone and address as Site settings.

**Before going live (Pages):** write About Us (Admin → Pages → About), check the legal pages, and add contact details and social / app links in Site settings.

**Before going live (Rishta):** connect an SMS or WhatsApp OTP provider (the live site refuses to log in until then), and set the Rishta prices in Pricing.

**Before going live:** add your JazzCash / Easypaisa / bank details in Site settings and banner prices in Pricing. Until then the payment step shows “Payment details will be added soon” and the Advertise page shows “Booking opens soon”.

**Test data:** test ads AO-10001 to AO-10013, a test banner “Test Mobile Mall” (paused), a test promo code TEST50 (turned off), test Rishta profiles R-1001 to R-1003 with test interests (AO-10011 test plumber, AO-10012 test shop, with test reviews) and one test “Eid Sale” house banner were created while testing (`.local/seed-test-ads.mjs`). `npm run db:reset` clears everything (then run `npm run admin:create` again).

### Getting started (developers)

1. Install **Node.js** (22.6 or newer) and **Git**.
2. In the project folder: `npm install`
3. Website: `npm run dev:web` → http://localhost:3000 (works without a database; shows empty states). To connect the database, copy `.env.example` values into `apps/web/.env.local`.
4. App: `npm run dev:mobile`, then scan the QR code with the **Expo Go** app on your phone (phone and computer on the same Wi-Fi).
5. **Local database** (no Docker, no installer: real PostgreSQL 17 from the `embedded-postgres` npm package):
   - Put `DATABASE_URL=postgres://postgres:<your password>@localhost:5432/apna_okara` in `apps/web/.env.local`
   - `npm run db:setup` once (creates the database, runs `supabase/local/00_supabase_shim.sql`, all migrations and `supabase/seed.sql`)
   - `npm run db:start` before working (keep it running), `npm run db:migrate` after pulling new database changes, `npm run db:reset` to start fresh, `npm run db:query -- "select …"` to look at data
   - Data is stored in `.local/pgdata` (not committed).
   - The shim creates small local stand-ins for Supabase's `auth` (logins) and `storage` (files) so the same migration files run unchanged locally and on Supabase. Locally, admin login uses our own password check and photos are saved in a folder; these two parts switch to Supabase Auth / Storage at deployment.
   - `pg_cron` is not available locally, so the app calls `expire_listings()` itself during development.
6. **Deployment (at the end):** create the Supabase project, run `supabase/migrations/*.sql` then `supabase/seed.sql` (do NOT run the local shim), enable `pg_cron` and schedule `expire_listings()` (see end of the schema file), then deploy the website to Vercel.
7. Images: `npm run images` regenerates all PNG icons and share images from `scripts/make-images.mjs`.

**Pinned versions:** Next.js 14.2.35 (patched), React 18.3.1, Expo SDK 52 (React Native 0.76.9). Upgrading to Next 15/16 and newer Expo SDK can be done later as one separate task.

---

## Table of Contents

1. [Vision](#1-vision)
2. [Coverage Areas](#2-coverage-areas)
3. [The 6 Models](#3-the-6-models)
4. [Categories](#4-categories)
5. [Listing Flow](#5-listing-flow)
6. [Pricing](#6-pricing)
7. [Ratings & Reviews](#7-ratings--reviews)
8. [Public Website Pages](#8-public-website-pages)
9. [Blog](#9-blog)
10. [Admin Panel](#10-admin-panel)
11. [Data Retention Rules](#11-data-retention-rules)
12. [Bilingual (Urdu / English)](#12-bilingual-urdu--english)
13. [SEO, AEO & GEO](#13-seo-aeo--geo)
14. [WhatsApp & Facebook Community](#14-whatsapp--facebook-community)
15. [Safety & Anti-Fraud](#15-safety--anti-fraud)
16. [Tech Stack](#16-tech-stack)
17. [Database Design](#17-database-design)
18. [Branding](#18-branding)
19. [Mobile App](#19-mobile-app)
20. [Development Phases](#20-development-phases)
21. [Banner Advertising (Brands)](#21-banner-advertising-brands)
22. [Rishta (Matrimonial)](#22-rishta-matrimonial)
23. [Open Items (To Be Decided)](#23-open-items-to-be-decided)

---

## 1. Vision

OLX-style marketplace, but **hyper-local**:

- People of Okara & Sahiwal can **buy and sell** new and used items.
- **Service providers** (plumber, electrician, mechanic, etc.) can list themselves and get hired.
- **Local businesses** can list themselves in a directory.
- Listings are **paid**, verified manually by admin via payment screenshot.
- Listings **expire automatically** after the purchased duration and disappear from the public site.
- The **admin panel keeps everything**, including expired and rejected listings, with full details.
- The site is connected to the **private WhatsApp group** and **Facebook page** of the community.

---

## 2. Coverage Areas

Only these areas are selectable. No other city can be chosen.

| District | Cities / Towns |
|---|---|
| **Okara** | Okara City, Renala Khurd, Depalpur, Haveli Lakha, Basirpur, Hujra Shah Muqeem |
| **Sahiwal** | Sahiwal City, Chichawatni, Harappa |
| **Pakpattan** | Pakpattan City, Arifwala |

- Each city has a list of **mohallas / localities** (e.g. Satghara Road, Depalpur Road, Model Town).
- Admin can add, edit or disable cities and localities from the admin panel.

---

## 3. The 6 Models

| # | Model | Who lists | Billing | Expiry |
|---|---|---|---|---|
| 1 | **Buy / Sell** | Anyone | Per duration (7 to 30 days) | Auto-expire |
| 2 | **Vehicles** | Anyone | Per duration | Auto-expire |
| 3 | **Property** (Sale / Rent) | Owners, dealers | Per duration | Auto-expire |
| 4 | **Jobs** | Employers and job seekers | Per duration | Auto-expire |
| 5 | **Service Providers** | Plumbers, electricians, tutors, etc. | Rs 500 / 2 months | Auto-expire, renewable |
| 6 | **Business Listings** | Shops, clinics, restaurants, etc. | Rs 500 / 2 months | Auto-expire, renewable |

Models 5 and 6 have **profiles with ratings and reviews**.

---

## 4. Categories

Modelled on OLX, plus local categories important for Okara and Sahiwal (livestock, agriculture).
All categories and sub-categories are **managed from the admin panel** (add, edit, reorder, disable, set pricing).

### Buy / Sell
- **Mobiles:** Mobile phones, tablets, accessories, smart watches
- **Electronics & Home Appliances:** TV, fridge, AC, washing machine, computers and laptops, cameras, solar panels, UPS and batteries, kitchen appliances
- **Furniture & Home Decor:** Sofa, beds, wardrobes, tables and chairs, office furniture, decor, rugs
- **Fashion & Beauty:** Men, women, kids clothing, shoes, jewelry, watches, cosmetics
- **Books, Sports & Hobbies:** Books, sports equipment, gym, musical instruments, collectibles
- **Kids:** Toys, baby gear, prams, kids furniture
- **Mawaishi / Animals:** Cows, buffaloes, goats, sheep, Qurbani animals, hens and poultry, birds, pets (cats, dogs, fish), animal feed
- **Zarai / Agriculture:** Seeds, fertilizer, agri tools, tube wells and motors, crops and produce
- **Business & Industrial:** Machinery, shop equipment, raw material, wholesale stock
- **Other:** Anything else

### Vehicles
Cars, motorcycles, rickshaws and loaders, tractors and trolleys, bicycles, buses and vans, spare parts, accessories

### Property
- **For Sale:** Houses, plots, shops, commercial, agricultural land
- **For Rent:** Houses, upper/lower portions, rooms, shops, offices, hostels, warehouses

### Jobs
Sales, driver, teacher and tutor, office and admin, IT and computer, accountant, labour, security guard, cook and domestic, medical, part-time, other. Two types: **Hiring** and **Looking for work**.

### Service Providers
Plumber, electrician, AC/fridge mechanic, carpenter, painter, mason (mistri), welder, auto mechanic, mobile/computer repair, CCTV installer, solar installer, tutor and academy, tailor (darzi), beautician and salon, catering, tent and decor, movers and packers, cleaning, pest control, photographer, driver on call, other

### Business Directory
Shops and stores, restaurants and food, clinics and hospitals, pharmacies, schools and academies, showrooms, workshops, hotels and marriage halls, wholesalers, banks and offices, other

---

## 5. Listing Flow

```
Post Ad → Fill details + photos → Choose duration and add-ons → See payment info
→ Pay via JazzCash / Easypaisa / Bank → Upload screenshot + Transaction ID
→ Status: PENDING → Admin reviews → APPROVED (goes live) or REJECTED (with reason)
→ Auto-expires after duration → Status: EXPIRED (hidden from public, kept in admin)
→ Renew option (new payment)
```

### Listing statuses

| Status | Visible to public | Kept in admin |
|---|---|---|
| `pending` | No | Yes |
| `approved` / `live` | Yes | Yes |
| `rejected` | No | Yes, with reason |
| `expired` | No | Yes |
| `removed` (by admin: fraud, report) | No | Yes, with reason |
| `sold` (marked by seller) | No (or shown as "Sold") | Yes |

### Ad form fields
- Title (min/max length)
- Category, then sub-category
- Price (or "Contact for price" / "Free")
- Condition: New / Used (where relevant)
- Description
- City, then locality
- Photos: 1 to 8, auto-compressed and converted to WebP
- Seller name, WhatsApp number, phone number (can be different)
- Category-specific fields, e.g.:
  - Vehicles: make, model, year, km driven, fuel, registration city
  - Property: area (marla/kanal), bedrooms, bathrooms, furnished
  - Jobs: salary range, job type, experience
  - Animals: breed, age, weight, milk (litres/day)
- Duration (7 / 10 / 15 / 20 / 25 / 30 days)
- Add-ons: Featured, WhatsApp Group Boost
- Payment screenshot + Transaction ID + paid from (number/name)
- Accept Terms & Posting Rules (checkbox)

### Seller access (no login)
- Sellers do **not** create an account.
- After submitting, the seller gets a **Reference Number** (e.g. `AO-10234`) on screen, with a "Save / Share on WhatsApp" button.
- On `/my-ad`, the seller enters Reference Number + phone number to:
  - check status (pending / live / rejected / expired)
  - mark as **Sold**
  - **renew** an expired ad
  - request an edit (goes to admin)
- Admin can also find any ad by phone number and help the seller.
- Service providers and businesses use the same method to manage their profile.

### Auto-expiry
- A scheduled job runs **every hour**.
- Any listing whose `expires_at` has passed is set to `expired`.
- Expired listings disappear from search, categories, homepage and sitemap.
- Expired listing URLs show a "This ad has expired" page with similar live ads (no 404).
- Optional: reminder on WhatsApp 1 day before expiry ("Renew your ad?").

---

## 6. Pricing

### Default pricing: normal ads (Buy/Sell, Vehicles, Property, Jobs)

| Duration | Price |
|---|---|
| 7 days | Rs 150 |
| 10 days | Rs 200 |
| 15 days | Rs 300 |
| 20 days | Rs 350 |
| 25 days | Rs 400 |
| 30 days | Rs 450 |

### Service Providers and Business Listings

| Plan | Price |
|---|---|
| 2 months | Rs 500 |

### Add-ons

| Add-on | Price | What it does |
|---|---|---|
| **Featured** | +Rs 200 | Shown at top of category and search, highlighted badge, homepage featured slot |
| **WhatsApp Group Boost** | +Rs 200 | Admin posts the ad in the WhatsApp group and Facebook page |

### Free listings: fully controlled by admin
The owner decides from the admin panel when, how long and for whom listings are free. Nothing is hard-coded.

**Admin → Settings → Free Listings**
- **Free Mode ON / OFF** switch (instant).
- Optional **start date and end date** (turns on/off by itself), or leave empty to control manually.
- **Free duration** per model, chosen by admin (e.g. 30 days for ads, 60 days for providers/businesses). Any number of days.
- **Apply to:** all models, or selected models / categories only (e.g. free only for Services).
- **Limit per phone number** (e.g. max 3 free ads per number) to stop abuse. Optional.
- **Banner text** (Urdu + English) shown on site and app while Free Mode is on.

While Free Mode is on:
- Payment and screenshot step is skipped for the free categories.
- Ads still go to **Pending** and admin still approves them (quality control).

**Per-ad control (any time, Free Mode on or off):**
- **Give free:** approve any single ad without payment.
- **Extend free:** add any number of extra days to any live or expired ad.
- **Free Featured / Free Boost:** give Featured or WhatsApp Boost to any ad for free.
- Every free action is recorded in the ad history and in reports (marked "Free by admin").

### Per-category pricing
- The table above is the **default**.
- Admin can set a **different price for every category and every duration** from the Pricing page (e.g. Property 7 days = Rs 250).
- Admin can run **promotions**: free listings for a launch period, discount codes, and "first ad free".

### Payment methods
JazzCash, Easypaisa, Bank Transfer. Account titles and numbers are configurable in admin settings. *(Details TBD.)*

---

## 7. Ratings & Reviews

For **Service Providers** and **Business Listings** only.

- 1 to 5 stars and a written comment.
- Reviewer gives name and phone number. Phone is never shown publicly.
- **One review per phone number per provider.**
- Provider profile shows average rating, number of reviews, member since, and areas served.
- **Verified badge** given manually by admin.
- Admin can hide or delete fake or abusive reviews.
- Provider can post one public reply to each review *(Phase 3)*.

---

## 8. Public Website Pages

### Main pages
| Page | URL (English) | Purpose |
|---|---|---|
| Home | `/` | Search bar, categories, featured ads, latest ads, top service providers, city links, blog highlights |
| All categories | `/categories` | Full category tree |
| Category page | `/[category]` | Listings with filters |
| Category + city page | `/[category]/[city]` | e.g. *Used mobiles in Okara*. Important for SEO |
| Sub-category page | `/[category]/[sub-category]` | Filtered listings |
| Listing detail | `/ad/[slug]-[id]` | Photos, details, price, WhatsApp/Call buttons, share, report, similar ads |
| Search results | `/search?q=` | Keyword search with filters |
| Services | `/services` | All service categories and providers |
| Service provider profile | `/services/[slug]` | Profile, ratings, reviews, contact |
| Business directory | `/businesses` | All businesses |
| Business profile | `/businesses/[slug]` | Profile, timings, map, ratings, contact |
| Jobs | `/jobs` | Job listings |
| Property | `/property` | Sale / Rent listings |
| Vehicles | `/vehicles` | Vehicle listings |
| City page | `/city/[city]` | Everything in one city (e.g. Renala Khurd) |
| Post an Ad | `/post-ad` | Multi-step ad form |
| Ad submitted | `/post-ad/success` | Confirmation, reference number, "what happens next" |
| Check ad status | `/my-ad` | Check status by reference number + phone |
| Pricing | `/pricing` | All plans and add-ons |
| Blog | `/blog` | Articles |
| Blog post | `/blog/[slug]` | Single article |
| Blog category | `/blog/category/[slug]` | Posts by topic |

### Home page layout (top to bottom)

OLX-style layout (simple, fast, familiar), with Apna Okara's own local touches.

**Design goals for the home page:**
- A visitor should understand **in one look** what the site is and what is on it.
- **Banners** (ours and paid brand ads) are visible right at the top, **next to the hero**.
- **Categories** are big, clear and easy to tap, with Urdu names.
- **Featured ads** stand out clearly (orange badge, top position, larger cards).
- **Ads** show clearly: big photo, price in bold, title, area and time.

| # | Section | What it shows |
|---|---|---|
| 1 | **Top bar** | "Okara, Sahiwal aur Pakpattan ka apna bazaar", Download App, اردو / EN, Advertise, Help |
| 2 | **Header** | Logo, city selector, large search bar with category dropdown, My Ads, orange **"+ Post Ad"** button |
| 3 | **Category menu bar** | "All Categories" dropdown + links: Mobiles, Vehicles, Property, Jobs, Services, Mawaishi, Electronics, Business… |
| 4 | **Offer bar** | Free Mode / sale / announcement message (text set by admin, can be turned off) |
| 5 | **Hero section** | See "Hero section" below: our slider + paid brand banners side by side |
| 6 | **Trust points** | Sirf local log · Har ad admin verified · WhatsApp par seedha rabta · Urdu aur English |
| 7 | **Categories grid** | 14 large icons with English + Urdu names: Mobiles, Vehicles, Property, Jobs, Services, Mawaishi, Electronics, Furniture, Fashion, Zarai, Books and Hobbies, Kids, Business, More |
| 8 | **Featured ads** | 8 featured ads in larger cards, orange "Featured" badge, "View all" |
| 9 | **Wide banner** | Our sale banner or a paid brand banner (placement B) |
| 10 | **Fresh ads** | 12 latest ads; a sponsored card after every 8 ads |
| 11 | **Seasonal section** | Changes with the season, e.g. "Qurbani Mandi", "Books and Uniforms". Admin turns it on/off and picks the category |
| 12 | **Top service providers** | 6 cards with stars, Verified badge, Call / WhatsApp buttons + "List your service" button |
| 13 | **Popular in your city** | Tabs: Vehicles / Property / Jobs for the selected city |
| 14 | **Latest jobs** | List of new jobs with salary and area |
| 15 | **Local businesses** | Shops, clinics, restaurants, etc. |
| 16 | **How it works** | 4 steps: Post ad → Admin approves → Ad goes live → Sell |
| 17 | **Browse by city** | Okara, Renala Khurd, Depalpur, Haveli Lakha, Basirpur, Hujra Shah Muqeem, Sahiwal, Chichawatni, Harappa, Pakpattan, Arifwala |
| 18 | **For brands** | "Apna banner lagwayein" + link to Advertise and Pricing |
| 19 | **Community + App** | Two boxes side by side: Join WhatsApp community, Download the app |
| 20 | **From the blog** | Latest 3 posts |
| 21 | **FAQ** | 6 common questions with answers (AEO) |
| 22 | **SEO text** | Short paragraph about Apna Okara, its areas and categories |
| 23 | **Footer** | See "Footer" below |

**Mobile / app:** same order, plus a bottom bar: Home · Search · **+ Post Ad** · My Ads · Menu.

**Admin: Homepage Manager**
- Turn any home page section on/off and change its order.
- Edit offer bar text, seasonal section, trust points.
- Manage hero slides and our own banners (image, text, button, link, start/end date).

### Hero section

The hero is the first thing a visitor sees. It shows **our own promotions and paid brand ads together**.

```
┌──────────────────────────────────────────┬────────────────────────┐
│                                          │  Paid brand banner 1   │
│   Main slider (3–5 slides, auto-rotate)  │  (Sponsored)           │
│                                          ├────────────────────────┤
│   Our slides + paid brand slides         │  Paid brand banner 2   │
│   Title, short text, button              │  or our sale / offer   │
│   • • • •                                │  (Sponsored)           │
└──────────────────────────────────────────┴────────────────────────┘
```

- **Main slider (left, large):** mix of our own slides (e.g. "Ad lagayein bilkul free", "Eid Sale: Featured ads 50% off", "Qurbani Mandi online", "Download the app") and **paid brand slides** (placement A).
- **Side banners (right, 2 stacked):** **paid brand banners** (placement A2), or our own sale/offer when no paid banner is booked.
- Paid banners carry a small "Sponsored" label.
- On mobile: slider on top, the 2 side banners below it side by side.
- Everything is managed from admin (Homepage Manager + Banner Manager), with start/end dates.

### Footer

Same footer on every page of the website. The app shows the same links in its Menu screen.

| Column | Content |
|---|---|
| **1. Apna Okara** | Logo, 2-line intro, social links (Facebook, WhatsApp, Instagram, YouTube), Google Play and App Store buttons |
| **2. Popular Categories** | Mobiles, Vehicles, Property, Jobs, Mawaishi, Electronics, Furniture, Zarai |
| **3. Services and Business** | Plumber, Electrician, AC Mechanic, Tutor, Business Directory, "List your service", "List your business" |
| **4. Cities** | Okara, Renala Khurd, Depalpur, Sahiwal, Chichawatni, Pakpattan, Arifwala |
| **5. Company and Help** | About, Contact, How It Works, Pricing, Advertise, Blog, FAQ, Safety Tips, Posting Rules |

**Bottom strip:** © Apna Okara · apnaokara.pk · Terms · Privacy · Refund Policy · Disclaimer · payment logos (JazzCash, Easypaisa, Bank) · اردو / EN

On mobile, the columns fold into tap-to-open sections.
Footer links are editable from the admin panel.

### Category pages

**Every category and sub-category has its own page**, also per city:
`/mobiles`, `/mobiles/okara`, `/mobiles/phones/sahiwal`, etc.

Page layout:
1. **Category banner** at top (ours, or a paid brand banner targeted to this category, placement C)
2. **Breadcrumb:** Home › Mobiles › Okara
3. **Heading:** e.g. "Mobile Phones for Sale in Okara" (Urdu and English)
4. **Sub-category chips:** e.g. Phones, Tablets, Accessories, Smart Watches
5. **Filters (left side; on mobile a "Filters" button):** city, locality, price range, New/Used, posted within, Featured only, plus **category-specific filters**:
   - Mobiles: brand, storage, PTA approved
   - Vehicles: make, model, year, km driven, fuel
   - Property: sale/rent, marla/kanal, bedrooms, furnished
   - Mawaishi: animal type, breed, age, weight
   - Jobs: job type, salary range, experience
   - Services: service type, rating, Verified only
6. **Results (right side):** ad count, sort (newest, price low → high, high → low), **Featured ads first**, then the rest, a sponsored card after every 8 ads, page numbers
7. **Bottom:** FAQ for this category, short SEO text, links to related categories and cities
8. **Footer**

### Company and info pages
| Page | URL |
|---|---|
| About Us | `/about` *(content to be provided by owner)* |
| Contact Us | `/contact` |
| How It Works | `/how-it-works` |
| FAQ | `/faq` |
| Join WhatsApp Community | `/community` |
| Advertise With Us | `/advertise` |
| Safety Tips | `/safety` |

### Legal pages
| Page | URL |
|---|---|
| Terms & Conditions | `/terms` |
| Privacy Policy | `/privacy` |
| Posting Rules / Prohibited Items | `/posting-rules` |
| Refund Policy | `/refund-policy` |
| Disclaimer | `/disclaimer` |

### System pages
404 Not Found, Expired Ad page, `sitemap.xml`, `robots.txt`, `llms.txt`

All pages exist in **both languages** (see Section 12).
All static pages (About, FAQ, Terms, etc.) are **editable from the admin panel**.

---

## 9. Blog

Purpose: bring Google and AI traffic, build trust, and educate users.

### Public
- Blog listing with categories, tags, search and pagination.
- Post page: title, cover image, author, date, reading time, table of contents, FAQ block, related posts, related live ads, share buttons, WhatsApp group CTA.
- Urdu and English versions of each post (or single-language posts, marked correctly).

### Example topics
- "Okara mein purana mobile kharidte waqt 10 baatein"
- "Best plumbers in Sahiwal: how to choose"
- "Qurbani ke janwar ki qeemat 2027: Okara mandi guide"
- "Renala Khurd mein ghar kiraye par lene ka tareeqa"
- "Online fraud se kaise bachein"
- Local news, events, market rates (gold, crops, livestock)

### Admin (Blog Manager)
- Create, edit, schedule, publish and unpublish posts.
- Rich text editor with images, headings, lists, tables, embedded YouTube.
- Blog categories and tags.
- Per-post SEO fields: meta title, meta description, slug, focus keyword, OG image, canonical, noindex.
- FAQ builder per post (generates FAQ schema).
- Authors with name, bio, photo.
- Draft / scheduled / published statuses.

---

## 10. Admin Panel

Login-protected at `/admin`. **Every record is kept forever.**

### Dashboard
- Today / this week / this month: revenue, new ads, approved, rejected, expired.
- Pending queue count (with alert).
- Charts: revenue per day, ads per category, ads per city.
- Top categories and top cities.

### Listings manager
- Tabs: Pending, Live, Expired, Rejected, Removed, Sold, All.
- Approve / Reject (with reason) / Remove / Edit / Extend / Renew / Make Featured.
- Full detail view: all fields, all photos, seller info, payment screenshot, transaction ID, approval date, approved by, expiry date, full history log.
- Filters: model, category, city, status, date range, price paid, featured.
- **Search by phone number** to see all ads ever posted by one person.
- One-click **"Copy WhatsApp post"** (ready text + link for group / FB).

### Payments
- Every payment, with screenshot, amount, method, transaction ID, status.
- **Duplicate check:** warns if the same transaction ID or screenshot was used before.
- Revenue reports, exportable to Excel/CSV.

### Service Providers and Businesses
- Same as listings, plus profile editing, Verified badge, ratings and reviews moderation.

### Reviews
- All reviews, hide / delete, filter by provider and rating.

### Reports from users
- Ads reported as fraud, wrong category, sold, or offensive. Admin takes action.

### Categories & fields
- Add / edit / reorder / disable categories and sub-categories (Urdu and English names, icon).
- Define category-specific form fields.

### Pricing
- Price per category per duration.
- Add-on prices (Featured, WhatsApp Boost).
- Discount codes and free-listing campaigns.

### Locations
- Add / edit / disable cities and localities (Urdu and English names).

### Blog Manager
See Section 9.

### Pages Manager
- Edit About, FAQ, How It Works, Terms, Privacy, Safety, etc. in both languages.
- SEO fields on each page.

### SEO Settings
- Default meta titles and descriptions per page type (with templates like `{title} in {city} – Apna Okara`).
- Organization info (name, logo, phone, social links) for schema.
- Redirects manager (301).
- Sitemap and robots settings, and `llms.txt` content.
- Google Search Console and Analytics IDs.

### Site Settings
- Logo, site name, contact details, social links, WhatsApp group/channel links.
- Payment account details shown to users.
- Homepage banners and announcements.

### Users & roles
- **Super Admin:** everything.
- **Moderator:** approve/reject listings and reviews only.
- **Blog Writer:** blog only.
- **Rishta Coordinator (female):** Rishta profiles, photos and mediation only.
- Activity log: who approved, rejected or edited what, and when.

### Backups & exports
- Export any table to Excel/CSV.
- Daily automatic database backup.

---

## 11. Data Retention Rules

| Data | Public site | Admin panel |
|---|---|---|
| Live listing | Shown | Kept |
| Expired listing: details | Hidden | **Kept forever** |
| Expired listing: first photo | Hidden | **Kept forever** |
| Expired listing: other photos | Hidden | Kept 30 days, then deleted to save storage *(configurable)* |
| Payment screenshots | Never public | **Kept forever** |
| Reviews | Shown while profile live | Kept forever |

---

## 12. Bilingual (Urdu / English)

- Language switcher in header. Choice is remembered.
- Separate URLs per language for SEO: `/en/...` and `/ur/...` (with `hreflang` tags).
- Urdu pages are **right-to-left (RTL)** with a proper Urdu font (Noto Nastaliq Urdu).
- All UI text, categories, cities, static pages and blog posts have both versions.
- Users write ad content in whichever language they want.
- Numbers and prices shown in a format readable in both.

---

## 13. SEO, AEO & GEO

### SEO (Search Engine Optimization: Google)
- **Server-side rendering** so Google sees full content.
- Clean, readable URLs with keywords: `/en/mobiles/okara`, `/ad/iphone-13-128gb-okara-1234`.
- **Programmatic local landing pages:** every category x city combination, e.g. *"Used Bikes for Sale in Sahiwal"*, *"Plumbers in Renala Khurd"*.
- Unique meta title, meta description, H1 on every page (templates editable in admin).
- **Structured data (Schema.org JSON-LD):**
  - `Organization`, `WebSite` (with SearchAction) on all pages
  - `Product` + `Offer` on buy/sell listings
  - `Vehicle` on vehicle listings
  - `RealEstateListing` / `Accommodation` on property
  - `JobPosting` on jobs (eligible for Google Jobs)
  - `LocalBusiness` / `Service` on service providers and businesses
  - `Article` / `BlogPosting` on blog posts
  - `FAQPage` on FAQ and blog FAQ blocks
  - `BreadcrumbList` everywhere
- **Dynamic XML sitemaps** (split: listings, categories, cities, blog, pages), updated automatically. Expired ads removed.
- `robots.txt`, canonical tags, `hreflang` for Urdu/English.
- **Rishta profiles are excluded** from SEO (noindex, not in sitemap). Only the Rishta landing page is indexed.
- Open Graph and Twitter cards so shared links on WhatsApp and Facebook show image, title and price.
- **Fast performance:** WebP images, lazy loading, CDN, good Core Web Vitals on mobile.
- Internal linking: breadcrumbs, related ads, "more in this city", blog-to-category links.
- Image alt text auto-generated from title + city.
- Google Search Console and Google Business Profile setup.

### AEO (Answer Engine Optimization: Google snippets, voice search)
- FAQ sections on homepage, category pages, city pages and blog posts.
- Question-style headings ("Okara mein plumber kitne paise leta hai?") followed by a short, direct 40 to 60 word answer.
- Summary / "Quick answer" box at the top of blog posts.
- Tables and lists for prices and comparisons (snippet-friendly).
- Natural Urdu and Roman Urdu phrasing for voice search.

### GEO (Generative Engine Optimization: ChatGPT, Gemini, Perplexity, Claude)
- `llms.txt` file describing the site, its coverage and key pages.
- Allow AI crawlers in `robots.txt` (configurable in admin).
- Clear, factual "entity" information on About Us: what Apna Okara is, which areas it serves, since when, contact details. Same name, address and phone everywhere (website, Facebook, Google Business Profile).
- Statistics and original local data in blog posts (e.g. average bike prices in Okara this month) so AI tools cite the site.
- Author bios and dates on blog posts (trust signals).
- Consistent structured data so AI systems understand listings and businesses.

---

## 14. WhatsApp & Facebook Community

- WhatsApp **group is private** and managed by the owner manually.
- Website features to support it:
  - "Join our WhatsApp Community" button on every page, linking to `/community`.
  - "Share on WhatsApp" button on every ad and profile.
  - Admin "Copy WhatsApp post" button: ready-made text + link for each approved ad.
  - **WhatsApp Group Boost** paid add-on.
  - Optional public **WhatsApp Channel** link for daily new ads.
- Growth ideas (offline / manual):
  - Referral: bring 5 members, get one free 7-day ad (tracked manually or with a referral code).
  - QR code posters in mobile markets, mandi, shops.
  - Daily "Top 10 new ads" post in group and FB page.

---

## 15. Safety & Anti-Fraud

- **Report Ad** button on every listing.
- **Safety Tips** page and a short safety notice on every ad page ("Pehle cheez dekhein, phir paise dein").
- Prohibited items list (weapons, drugs, fake documents, etc.) in Posting Rules.
- Duplicate transaction ID / screenshot detection.
- Phone number blocklist (admin can block repeat fraudsters).
- Rate limiting and spam protection on forms (honeypot + invisible captcha).
- Seller phone shown only after clicking "Show number" (reduces scraping).
- Admin activity log.

---

## 16. Tech Stack

| Part | Choice | Why |
|---|---|---|
| Website + Admin | **Next.js** (React) | Server-side rendering for SEO, fast on mobile |
| Styling | **Tailwind CSS** | Fast to build, RTL support |
| Database | **Supabase (PostgreSQL)** | Free tier, reliable, scheduled jobs built in |
| Photo storage | **Supabase Storage** (or Cloudinary) | Image hosting with auto compression |
| Auto-expiry | **pg_cron** (inside Supabase) | Runs hourly, no extra server |
| Admin login | **Supabase Auth** | Secure admin accounts and roles |
| Hosting | **Vercel** | Free tier, global CDN |
| Translations | **next-intl** | Urdu/English with separate URLs |
| Rich text (blog) | **Tiptap** editor | Clean blog editing in admin |
| Domain | `apnaokara.pk` | Local .pk domain, builds trust in Pakistan |
| Mobile app | **React Native (Expo)** | One codebase for Android + iOS, shares the same Supabase backend |

Estimated monthly cost at launch: **close to zero** (only the domain, about Rs 3,000 to 5,000 per year). Upgrade only when traffic grows.

---

## 17. Database Design

Main tables (simplified):

| Table | Purpose |
|---|---|
| `cities` | City names (ur/en), district, active |
| `localities` | Mohallas linked to cities |
| `categories` | Category tree (parent/child), model type, names (ur/en), icon, active |
| `category_fields` | Extra form fields per category |
| `pricing` | Price per category per duration |
| `addons` | Featured, WhatsApp Boost, prices |
| `listings` | All ads of all 6 models, with status, dates, seller info, custom fields |
| `listing_images` | Photos per listing |
| `payments` | Screenshot, amount, method, transaction ID, status, linked listing |
| `reviews` | Rating + comment for providers/businesses |
| `reports` | User reports on ads |
| `blog_posts`, `blog_categories`, `blog_tags`, `authors` | Blog |
| `pages` | Editable static pages (About, FAQ, Terms…) |
| `seo_settings`, `redirects` | SEO control |
| `site_settings` | Logo, contacts, payment accounts, links |
| `admin_users`, `activity_log` | Admin roles and audit trail |
| `blocked_phones` | Fraud blocklist |
| `promo_codes` | Discounts and free campaigns |
| `rishta_accounts` | Phone-verified Rishta logins |
| `rishta_profiles` | Rishta profiles, status, expiry, private contact |
| `rishta_photos` | Private photos and who may see them |
| `rishta_interests` | Interests sent / accepted / declined |
| `rishta_reports`, `rishta_blocks` | Safety |

Nothing is hard-deleted from these tables. Status fields control visibility.

---

## 18. Branding

Simple, clean and local. Designed by us.

- **Name:** Apna Okara / اپنا اوکاڑہ
- **Logo:** Simple wordmark "Apna Okara" in English + Urdu, with a small location-pin icon. SVG format so it is sharp everywhere (website, app icon, WhatsApp DP, posters).
- **Colours (proposed):**
  - Primary: **Green** `#15803D` (Punjab, agriculture, trust)
  - Accent: **Orange** `#F97316` (Featured badges, call-to-action buttons)
  - Dark text `#1F2937`, light background `#F9FAFB`
- **Fonts:** Inter (English), Noto Nastaliq Urdu (Urdu)
- Deliverables: logo (light/dark), favicon, app icon, WhatsApp group DP, Facebook cover, OG share image.

---

## 19. Mobile App

Android + iOS app, built **together with the website**, feature by feature.

### Approach
- **React Native (Expo)** app, one codebase for Android and iOS.
- One **monorepo** holds website, app and shared code, so every feature is built once and used in both:
  ```
  apna-okara/
  ├── apps/web        → Next.js website + admin panel
  ├── apps/mobile     → Expo app (Android + iOS)
  └── packages/shared → types, form validation, Urdu/English text, categories, Supabase queries
  ```
- Same Supabase backend and **one admin panel** (web) controls both website and app.
- Website is also installable on phones (PWA) as a bonus.
- Published on **Google Play Store** and **Apple App Store** at launch.

### App features
- Everything on the website: browse, search, filters, post ad, my-ad status, services, businesses, jobs, property, blog
- Urdu / English
- Post ad with camera directly
- **Push notifications:** ad approved, ad expiring soon, new ads in a saved category
- Save favourite ads (stored on the phone, no login)
- One-tap WhatsApp / Call to seller
- Same backend (Supabase) and same admin panel as website. Admin does not need a separate panel.

### Store requirements
- Google Play developer account: one-time USD 25
- Apple developer account: USD 99 per year
- Privacy Policy and Terms pages (already part of the website)

---

## 20. Development Phases

**Everything in this README is built now.** The website and the app go live **together**, complete.
The phases below are only the **build order**: what is built first because later parts depend on it. Each phase builds the backend, admin, website and app parts of a feature together, and is tested before the next phase starts.

| Phase | Name | Depends on |
|---|---|---|
| 1 | Foundation | none |
| 2 | Admin Panel Core | 1 |
| 3 | Post an Ad | 1, 2 |
| 4 | Browse, Search & Ad Pages | 3 |
| 5 | Services, Businesses & Reviews | 3, 4 |
| 6 | Payments, Pricing & Free Mode | 3 |
| 7 | Rishta | 2, 6 |
| 8 | Static Pages & Blog | 2 |
| 9 | SEO, AEO & GEO | 4, 5, 7, 8 |
| 10 | Notifications, Growth & Extras | 3–7 |
| 11 | Testing, Launch & App Store Release | all |

---

### Phase 1: Foundation
*Everything else stands on this.*
- **Branding:** logo (English + Urdu), colours, fonts, favicon, app icon, splash screen, WhatsApp DP, FB cover, OG image
- **Monorepo:** `apps/web` (Next.js), `apps/mobile` (Expo), `packages/shared`
- **Supabase:** project, all database tables (Section 17), security rules (RLS), storage buckets for photos and screenshots
- **Seed data:** all categories, sub-categories, category fields, cities and localities (Okara, Sahiwal, Pakpattan), default prices
- **Urdu / English:** translation system for web and app, Urdu RTL layout, Urdu font
- **Design system:** buttons, cards, forms, header, footer, bottom tab bar (app), shared in both
- Domain `apnaokara.pk` connected, Vercel hosting, Expo build setup

### Phase 2: Admin Panel Core
*Admin must exist first so ads can be approved and settings controlled.*
- Admin login and roles (Super Admin, Moderator, Blog Writer) + activity log
- Dashboard layout (stats filled in as features are added)
- Categories manager (tree, Urdu/English names, icons, custom fields)
- Locations manager (cities, localities)
- Site Settings (logo, contacts, social links, WhatsApp links, payment account details)
- Free Listings settings (Section 6), so the owner controls it from day one

### Phase 3: Post an Ad
*The heart of the platform: getting ads in.*
- **Web + App:** multi-step Post Ad form for all 6 models, category-specific fields, photo upload (app: camera too), auto-compression
- Free Mode check (skip payment if free)
- Reference Number screen + "Share on WhatsApp"
- `/my-ad` (web) and "My Ads" screen (app): status, mark sold, renew, request edit. Ads saved on the phone for quick access (no login)
- **Admin:** Listings manager: Pending / Live / Expired / Rejected / Removed / Sold, approve / reject with reason / edit / extend / give free, full detail and history, search by phone, "Copy WhatsApp post"
- Auto-expiry job (hourly) and data retention rules (Section 11)

### Phase 4: Browse, Search & Ad Pages
*Getting ads out to buyers.*
- **Web + App:** full Home page (all 23 sections, hero with our slides + brand banner slots), footer, category, sub-category, city, category x city pages with category-specific filters, search with filters and sort
- **Admin:** Homepage Manager (sections on/off and order, hero slides, offer bar, seasonal section) and footer links
- Ad detail: photo gallery, details, WhatsApp / Call / Show number, share, similar ads, safety notice, Expired Ad view
- Vehicles, Property, Jobs sections with their own filters
- Favourites (saved on the phone / browser)
- Report Ad

### Phase 5: Services, Businesses & Reviews
- **Web + App:** Services and Business Directory listing pages, provider and business profile pages (timings, map, areas served, gallery)
- Ratings and reviews (1 per phone per provider), average rating, Verified badge, provider reply
- **Admin:** providers and businesses manager, review moderation, Verified badge control

### Phase 6: Payments, Pricing & Free Mode
- **Web + App:** payment step: payment details, method, screenshot upload, Transaction ID, amount
- Durations 7 / 10 / 15 / 20 / 25 / 30 days, Rs 500 / 2 months, Featured +Rs 200, WhatsApp Boost +Rs 200
- Featured ads on top of lists and homepage, Featured badge
- Renew expired ads with payment
- Promo / discount codes
- **Admin:** Pricing manager (per category per duration), Payments manager, duplicate Transaction ID / screenshot detection, revenue dashboard and charts, Excel / CSV export, phone blocklist
- Free Mode fully working with all its options
- **Banner Advertising** (Section 21): placements on web + app, Advertise With Us booking form, targeting, views/clicks tracking, admin Banner Manager, house banners

### Phase 7: Rishta
*Needs admin roles (Phase 2) and payments (Phase 6).*
- Phone + OTP login for Rishta (web + app)
- Create / edit profile with all fields, caste, native area and current city/country (overseas allowed)
- Private photos: blur, permission to view, watermark, screenshot block in app
- Search and filters
- Interest system: send, accept, decline, contact shown after mutual yes, daily limits
- Mediation request to Rishta Coordinator
- Profile fee Rs 1,000 (admin-editable), Premium, Coordinator service, Free Mode for Rishta
- Pages: Rishta home, login, search, profile, my interests, success stories, rules
- App Rishta tab + push notifications for interests
- **Admin:** Rishta Manager, female Rishta Coordinator role, verification, reports and blocks, revenue
- noindex on all profile pages

### Phase 8: Static Pages & Blog
- **Web + App:** About, Contact, How It Works, FAQ, Pricing, Safety, Community, Advertise, Terms, Privacy, Posting Rules, Refund Policy, Disclaimer, 404
- Blog: list, categories, tags, post page with table of contents, FAQ block, related posts and ads (app shows blog too)
- **Admin:** Pages Manager (edit all pages in Urdu/English), Blog Manager (editor, categories, tags, authors, scheduling, per-post SEO, FAQ builder)

### Phase 9: SEO, AEO & GEO
*Done after pages exist so every page type gets it.*
- Meta titles/descriptions with templates, canonical, hreflang, OG / Twitter cards
- All structured data (Section 13): Organization, WebSite, Product, Vehicle, RealEstateListing, JobPosting, LocalBusiness, Service, BlogPosting, FAQPage, BreadcrumbList
- Dynamic split sitemaps, robots.txt, `llms.txt`, AI crawler settings
- FAQ blocks and quick-answer boxes on home, category, city and blog pages
- Image alt text, performance tuning (Core Web Vitals), PWA install
- **Admin:** SEO Settings (templates, redirects, sitemap, robots, `llms.txt`, Search Console and Analytics IDs)
- App store listing SEO (title, description, keywords, screenshots in Urdu/English)

### Phase 10: Notifications, Growth & Extras
- **App push notifications:** ad approved / rejected, ad expiring soon, new ads in saved category
- Expiry reminder via WhatsApp link (admin one-click) and push
- Referral codes ("bring 5 members, get a free ad")
- "Join WhatsApp Community" flows, QR code generator in admin for posters
- Daily "Top new ads" post generator for WhatsApp group / FB page
- Daily database backup, export of any table
- Final admin dashboard: all stats and charts

### Phase 11: Testing, Launch & App Store Release
- Full testing on web (mobile + desktop browsers) and app (Android + iOS), both languages
- Speed, security and spam checks
- Real-content setup: categories reviewed, About Us, contact details, payment details, first blog posts
- Website live on `apnaokara.pk`, Google Search Console, sitemap submitted, Google Business Profile
- App published on **Google Play Store** and **Apple App Store** (developer accounts: Google USD 25 one-time, Apple USD 99/year)
- Announce in WhatsApp group and Facebook page

---

## 21. Banner Advertising (Brands)

Brands and local businesses can show **banner ads** on the website and app, e.g. a mobile shop announcing a new phone, a school announcing admissions, a showroom with a new bike model.

### Banner placements

| # | Placement | Where | Size (desktop / mobile) |
|---|---|---|---|
| A | **Home hero slider** | Top of home page, rotating slides (mixed with our own slides) | 1200x400 / 800x400 |
| A2 | **Hero side banners** | 2 stacked banners right next to the hero slider | 400x195 / 400x200 |
| B | **Home strip** | Between home page sections | 1200x200 / 800x250 |
| C | **Category top** | Top of a category or city page | 1200x200 / 800x250 |
| D | **In-feed** | Inside listing grid, after every 8 ads, looks like a card | 400x400 |
| E | **Ad detail side** | Next to / below ad details | 300x600 / 800x250 |
| F | **App home** | Top of app home screen | 800x400 |
| G | **Popup** *(optional, admin can disable)* | Once per visitor per day | 600x600 |

### Targeting
- All site, or only selected **cities** (e.g. only Sahiwal)
- All categories, or only selected **categories** (e.g. a mobile shop's banner only on Mobiles pages)
- Website, app, or both
- Urdu banner, English banner, or both

### Booking flow (for brands)
1. Brand opens **Advertise With Us** (`/advertise`) page and sees placements, sizes and prices.
2. Fills form: business name, contact, WhatsApp, placement, cities/categories, start date, duration, click link (website, WhatsApp, phone, or their Apna Okara profile).
3. Uploads banner image(s), or ticks **"Design my banner"** (extra charge, admin designs it).
4. Pays and uploads payment screenshot + Transaction ID (skipped if admin gives it free).
5. Goes to admin as **Pending** → admin approves → banner runs automatically from start date to end date, then stops by itself.

### Pricing
- Set **by admin** per placement per duration (7 / 15 / 30 days, or custom).
- Admin can give discounts, free banners, or package deals.
- Banner design service price set by admin.

### Tracking
- **Views** (impressions) and **clicks** counted for every banner.
- Admin sees stats per banner; brand gets a private stats link to see its own views and clicks.

### Admin: Banner Manager
- Pending / Scheduled / Running / Expired / Rejected tabs, **all kept forever** with full details and payment record.
- Create a banner directly (for deals made on phone/WhatsApp).
- Set rotation order and max banners per placement.
- Pause, extend, edit dates, give free.
- Own **house banners** (e.g. "Join our WhatsApp group", "Post your ad free") shown when no paid banner is running.

---

## 22. Rishta (Matrimonial)

A separate, **private and secure** section where families from Okara, Sahiwal and Pakpattan can find rishtas.
Privacy and respect, especially for women, come first. This section has **stricter rules** than the marketplace.

### Who can join
- Profile can be made by the person **or by parents, siblings or relatives** (form asks "Profile created by").
- **Minimum age 18.** No profile below 18.
- Families from **Okara, Sahiwal and Pakpattan**, including those living in other cities (Lahore, Karachi…) or **abroad**. Profile shows "Native area" and "Currently living in".

### Login (required for Rishta only)
- The marketplace has no login, but **Rishta needs an account** for privacy and the interest system.
- Login with **phone number + OTP** (SMS, about Rs 1–2 per SMS) or WhatsApp verification.
- One phone number = one account. An account can hold more than one profile (e.g. a parent making profiles for two children).

### Profile fields

| Part | Fields |
|---|---|
| Basic | Gender, age (date of birth), height, complexion, marital status (never married, divorced, widowed), children (if any) |
| Religion | Religion, sect (maslak), **caste / biradari** |
| Education and work | Education, profession, monthly income range |
| Location | Native area (city, locality), currently living in (city / country), house (own / rented) |
| Family | Father's and mother's profession, number of brothers and sisters, how many married, family type (joint / separate) |
| About | Short description (no phone numbers or links allowed; filtered automatically) |
| Looking for | Age range, height, education, marital status, caste preference, city / country |
| Photo | Optional, **always private** (see Privacy) |
| Contact | Parent / guardian name and phone, **never shown publicly** |

### Privacy rules
- **Name, phone number and address are never shown.** Each profile has only an ID, e.g. `R-1025`.
- **Photos are blurred** by default. Clear photo shown only to people the profile owner approves.
- Photos carry an **Apna Okara watermark**; screenshots blocked in the app (Android).
- Rishta pages are **not indexed by Google** (`noindex`, excluded from sitemap and `llms.txt`). Only the Rishta landing page is public for SEO.
- Only logged-in, approved members can browse profiles.
- **Every profile is checked and approved by admin** (phone call verification) before it goes live.
- **Girls' profiles are checked by a female coordinator.**

### How contact works (mutual interest)
1. Family A likes a profile and sends **"Interest"** (dilchaspi).
2. Family B gets a notification, views Family A's profile, and **Accepts** or **Declines**.
3. **Only when both say yes**, contact numbers are shown to both families.
4. No direct messages before mutual acceptance, so nobody can be harassed.
5. Families can also ask the **Rishta Coordinator** to mediate instead (admin connects both families).
6. Limit on how many interests can be sent per day (stops spam).

### Search and filters
Gender, age, height, city / country, education, profession, caste / biradari, sect, marital status, "with photo only", "recently joined".

### Pricing
- **Profile fee: Rs 1,000** (default for 3 months; admin can change amount and duration).
- Optional **Premium** (send more interests, profile shown on top, see who viewed you), price set by admin.
- Optional **Coordinator service** (admin finds suitable matches), price set by admin.
- Payment by screenshot + Transaction ID, same as ads. Free Mode for Rishta controlled separately from admin.

### Pages
| Page | URL | Public |
|---|---|---|
| Rishta home | `/rishta` | Yes (intro, how it works, privacy promise, pricing) |
| Sign up / Login | `/rishta/login` | Yes |
| Create / edit profile | `/rishta/profile/edit` | Members |
| Search | `/rishta/search` | Members |
| Profile view | `/rishta/R-1025` | Members (noindex) |
| My interests | `/rishta/interests` | Sent, received, accepted |
| Success stories | `/rishta/success` | Yes (only with both families' permission) |
| Rishta rules and safety | `/rishta/rules` | Yes |

The app has a **Rishta** tab with the same screens, plus push notifications for new interests and acceptances.

### Admin: Rishta Manager
- Pending profiles: verify by phone call, then approve / reject (with reason).
- All profiles kept **forever** with full details, even after expiry or deletion by the user.
- Interests log: who sent to whom, response, date. Matches and completed rishtas.
- Reported profiles, blocked users, fake profile flags.
- **Rishta Coordinator (female) role:** handles girls' profiles and photo approvals.
- Mediation requests from families.
- Rishta revenue report.

### Safety
- Report and Block buttons on every profile.
- Phone numbers and links auto-removed from "About" text.
- Expired profile (fee period over) hidden from search; renew to show again.
- Rishta rules accepted at signup (no fake info, no misuse of photos, respectful behaviour).

---

## 23. Open Items (To Be Decided)

- [ ] About Us content *(owner will provide)*
- [ ] Payment account titles and numbers (JazzCash, Easypaisa, Bank) *(needed before Phase 2)*
- [ ] Contact details: phone, email, address *(needed before Phase 1 launch)*
- [ ] Facebook page link and WhatsApp group/channel links
- [ ] Who writes blog posts *(needed before Phase 3)*
- [ ] Approve proposed logo and colours (Section 18)
- [ ] Google Play and Apple developer accounts (owner creates them, needed in Phase 10)

### Done
- [x] WhatsApp Group Boost price: Rs 200
- [x] Include Pakpattan / Arifwala: Yes
- [x] Domain: `apnaokara.pk`
- [x] Seller login: No login, Reference Number + phone
- [x] Logo and colours: designed by us, simple
- [x] Free listings: fully controlled by admin (no fixed dates)
- [x] Scope: complete website + complete app, all built now
- [x] Mobile app: built alongside the website

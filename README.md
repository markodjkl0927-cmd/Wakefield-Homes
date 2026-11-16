# Wakefield Homes — presentation prototype

A clickable presentation build of a new Wakefield Homes website, based on the current
[wakefieldhomeslc.com](https://wakefieldhomeslc.com) and the client's brief:

| Client asked for | Where it is |
| --- | --- |
| Same pages as the current site, same colors, no logo — just "Wakefield Homes" | Public site: Move In Ready Homes, Our Homes (Home Gallery, Build On Your Lot, Included Features, BOYL Price List, View My Home), About Us (Our Story, Awards, Memberships, Licenses, In the News), Our Communities, Our Reviews, Contact Us, Finance (Home Purchase, BOYL), VPDES. Text wordmark, royal-blue / periwinkle palette taken from the current site. |
| 3D live view of the homes on the homepage | Homepage "Walk around every home — live in 3D" section, plus 3D on every home, plan and owner page. Houses are generated in 3D from each plan's parameters (style, stories, roof, siding, porch, garage, colors); staff can also upload a real `.glb` model. |
| Access (Home Owners, Staff login) with dashboards | **Access** button in the header → Home Owners login or Staff login. |
| Home Owner dashboard: My Agreements, Homes, Appointment booking, Home maintenance (Gardening, Road Fixing, Make a Report, House Fix) | `/owner` |
| Staff dashboard: receive and update bookings, appointments and requests; update homes and enable 3D viewing | `/staff` |
| Super Admin: create / modify / delete home owner and staff accounts, manage all platform features | `/admin` (plus everything staff can do) |
| Oronoco Street CMA (the client's spreadsheet "CMA Oronoco Master Updated 11-4-26") | Staff → **Market analysis** (`/staff/market`): the 13 comparable homes, market figures and estimated prices for 1007, 1007½ and 1009 Oronoco Street. The defaults reproduce the spreadsheet; staff can switch between average, median, high and low price per sq ft, add appreciation and leave comparables out. Each Oronoco home's editor shows its estimate next to the price. Staff only (needs the "Edit homes" permission); the website still says "Price TBD". Data: `src/data/marketAnalysis.ts`. |

> This is a **front-end prototype for presenting**. There is no server: data lives in the
> browser (localStorage) and sign-in is simulated. Do not put real customer data in it.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173. If your machine resolves `localhost` oddly, use `npm run dev -- --host 127.0.0.1` and open http://127.0.0.1:5173.

Production build (static files in `dist/`, deployable to Netlify or Vercel — SPA rewrites are included):

```bash
npm run build
npm run preview
```

## Demo accounts

All passwords are `demo1234`. The login pages also have one-click demo buttons, and the user menu in every dashboard can **switch demo account** or **reset demo data**.

| Role | Name | Email |
| --- | --- | --- |
| Home Owner | Daniel Ellis — one finished home, one under construction | daniel@example.com |
| Home Owner | Priya Raman | priya@example.com |
| Home Owner | Olivia Bennett | olivia@example.com |
| Staff | Sarah Mitchell — Customer Care Manager | sarah@wakefieldhomes.test |
| Staff | Tom Becker — Construction Manager | tom@wakefieldhomes.test |
| Super Admin | Alex Morgan | admin@wakefieldhomes.test |

## Suggested presentation flow (≈10 minutes)

1. **Homepage** — hero, then the live 3D section: switch between homes, rotate, try Dusk / Night.
2. **Move In Ready Homes → a home** — photos, 3D, payment estimator, inquiry form.
3. **Home Gallery → a plan** — filters, the plan page with its 3D model and Build On Your Lot price.
4. **Access → Home Owners** — sign in as Daniel. Show the overview, the change order *updated by staff* (sign it), book an appointment, file a *Gardening* or *Road fixing* request with a photo.
5. **Switch demo account → Staff** (user menu) — the new booking and request are waiting: confirm the booking, assign and reply to the request, open **Homes & 3D**, change a home's colors live and toggle 3D. Then open **Market analysis**: the Oronoco Street estimates from the CMA — switch to Median, untick a comparable, and use **Edit home** to jump to the listing.
6. **Switch → Super Admin** — create a home owner account and assign a home, change a staff permission, turn a feature off (e.g. maintenance requests) and show it disappear for owners, browse the activity log.
7. **Switch back to Daniel** — the confirmed appointment and staff reply are there.

## Project structure

```
src/
  App.tsx                 routes (public site, /owner, /staff, /admin)
  types.ts                domain model (homes, agreements, appointments, requests, users, settings…)
  data/                   real Wakefield content, 24 floor plans + prices, communities, photo URLs, the Oronoco Street CMA, demo seed data
  store/                  Zustand demo "backend" persisted to localStorage (+ toasts, confirm dialog)
  components/ui/          design-system components (buttons, forms, modals, tables, charts…)
  components/site/        public layout, header, footer, cards, hero
  components/portal/      dashboard layout, navigation, guards
  three/                  procedural 3D house viewer (three.js / react-three-fiber), GLB uploads (IndexedDB)
  pages/public|auth|owner|staff|admin
scripts/
  shot.mjs                screenshot any route:  node scripts/shot.mjs /owner --as owner --mobile
  qa.mjs                  QA sweep: console errors, headings, overflow, axe accessibility, broken links
```

Stack: Vite, React 19, TypeScript, Tailwind CSS 4, React Router, Zustand, three.js / @react-three/fiber, lucide icons.

## Photos

Photos are the client's own, loaded from the current site's media library (`src/data/images.ts`).
That server is slow (1–9 s per image), so images fade in behind placeholders. For a smooth live
presentation, download them into `public/images/` and point `src/data/images.ts` at the local copies.

## Turning this into the real site

The prototype is structured so the store actions map one-to-one onto API endpoints. A production
version needs a real backend (accounts, roles, documents, scheduling, file storage), secure
authentication, e-signature, email/SMS notifications and a CMS for listings.

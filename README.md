# Royal Fade: Premium Barber Studio (MERN)

**Your Style. Our Craft.** A complete barber-shop website with online booking, email-verified appointments, an owner dashboard and a separate developer account for maintaining the service catalogue. Built for a **single Vercel project**: the React site is static, and the Express API runs as one serverless function.

> Royal Fade is a **demonstration business**. The address, phone number, email, testimonials, team and policies are sample content. The images are generated illustrations, not photographs (see [Images](#images)).

---

## Contents

1. [Features](#features)
2. [Project structure](#project-structure)
3. [Technologies](#technologies)
4. [Local installation](#local-installation)
5. [MongoDB Atlas setup](#mongodb-atlas-setup)
6. [SMTP (email) setup](#smtp-email-setup)
7. [Environment variables](#environment-variables)
8. [Running locally](#running-locally)
9. [Tests](#tests)
10. [Accounts: business admin and developer](#accounts)
11. [Roles and permissions](#roles-and-permissions)
12. [Deploying to Vercel](#deploying-to-vercel)
13. [Post-deployment configuration](#post-deployment-configuration)
14. [Customising the business](#customising-the-business)
15. [Images](#images)
16. [How booking and verification work](#how-booking-and-verification-work)
17. [Troubleshooting](#troubleshooting)
18. [Known limitations](#known-limitations)

---

## Features

**Customer website**
- Home, Services, Gallery (category filters and lightbox), About, Contact, Booking, Privacy Policy, Cookie Policy, Booking & Cancellation Policy and a 404 page.
- Fifteen sample services in four categories, prices in GBP (£), served from the database.
- Responsive design: warm charcoal and white sections with one amber accent, one self-hosted sans-serif font (no third-party font requests).

**Booking (no customer account needed)**
1. Service, 2. Barber (or *Any Available Barber*), 3. Date, 4. Time, 5. Details, 6. **Email verification**, 7. Confirm.
- Slots come from the server. They respect UK time (GMT/BST), shop hours, per-barber working hours, days off and unavailable dates, shop closure dates (bank holidays), a minimum lead time and a booking window.
- Taken slots are shown disabled. Double booking is blocked by a **unique database index**, so it holds across serverless instances and simultaneous requests.
- Appointments are saved as **Pending** with snapshots of the service name, price and duration.

**Email verification (OTP)**
- Six-digit code, valid 10 minutes, single use, only a keyed hash is stored, never returned by the API and never logged.
- 60-second resend cooldown, 5 codes per hour per email, 5 wrong attempts per code, plus per-IP rate limits.
- A successful check returns a one-time authorization token (valid 30 minutes, bound to that exact email, good for one booking). The server re-checks it when the booking is submitted.

**Emails (Nodemailer / any SMTP)**: verification code, request received, appointment confirmed, appointment cancelled, contact-form notification. Delivery status is stored per email; failures are shown in the dashboard and can be resent. A booking is never lost because an email failed.

**Dashboards** at `/admin/login`
- **Business owner**: statistics, all appointments (search, filter by date and status, details), confirm / cancel / mark completed, resend emails, read-only service catalogue, barber information, contact messages.
- **Developer**: add, edit, delete services and prices and descriptions, upload and replace service images. **No access** to appointments, customers or messages.

**Security**: JWT sessions with database-backed role checks and server-side logout (token revocation), bcrypt hashing, Zod validation of every input, NoSQL-injection-safe queries, Helmet, strict CORS, MongoDB-backed rate limiting, content-checked image uploads, safe error messages, a Content-Security-Policy for the site.

## Project structure

```
royal-fade/
├── package.json              root scripts: npm run dev / client / server / seed / create-developer / test
├── vercel.json               Vercel build + routing (do not delete)
├── api/index.js              Vercel serverless entry (3 lines of glue that reuse server/app.js)
├── client/                   React + Vite + Tailwind website and dashboards
│   ├── public/images/        all images (see Images)
│   ├── src/pages/            Home, Services, Gallery, About, Contact, Booking, Policies, admin/
│   ├── src/components/       Navbar, Footer, cards, DatePicker, EmailVerification, ...
│   ├── src/config/           site.js (social links, map), gallery.js
│   └── .env.example
└── server/                   Express API
    ├── server.js             local entry point (npm run dev / npm start)
    ├── app.js                the Express app (shared with Vercel)
    ├── config/               business.js (hours, barbers, contact), env.js, db.js, permissions.js
    ├── models/               MongoDB models
    ├── controllers/          request handlers
    ├── routes/               API routes (every dashboard route names its permission)
    ├── middleware/           auth, rate limiting, uploads, errors
    ├── services/             booking schedule, email, OTP, uploads, service catalogue
    ├── scripts/              seed.js, createDeveloper.js
    ├── utils/                small helpers (validation, errors, categories)
    ├── tests/
    └── .env.example
```

## Technologies

React 19, Vite, Tailwind CSS 3, React Router, Axios, Lucide React · Node.js 20+, Express 5, MongoDB with Mongoose, JWT, bcryptjs, Nodemailer, Multer, Zod, Helmet.

## Local installation

Requirements: **Node.js 20 or newer** and a MongoDB database (a free MongoDB Atlas cluster is easiest, or a local MongoDB).

```bash
npm install                              # run once in the project root: installs client + server
cp server/.env.example server/.env       # Windows CMD: copy server\.env.example server\.env
```

Open `server/.env` and fill in at least `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` and your SMTP settings (see below). Then:

```bash
npm run seed       # once: creates the 15 sample services and the business admin
npm run dev        # starts BOTH the website and the API
```

- Website: **http://localhost:5173**
- API: **http://localhost:5000** (the website proxies `/api` to it, so there is nothing else to configure)
- Dashboard: **http://localhost:5173/admin/login**

Other commands (all from the project root, all work in Windows PowerShell and CMD):

| Command | What it does |
|---|---|
| `npm run dev` | website + API together |
| `npm run client` / `npm run server` | just one of them |
| `npm run seed` | create / sync sample services and the admin account |
| `npm run create-developer` | create (or reset) the developer account |
| `npm run build` | production build of the website |
| `npm test` | all tests |

**Which `.env` file goes where**

| File | Needed? | Contains |
|---|---|---|
| `server/.env` | **yes** | Database, JWT secret, admin login, SMTP: everything secret. Never committed |
| `client/.env` | no | Only public values (WhatsApp number, social links, map). **Never put secrets here**: anything starting with `VITE_` is visible to every visitor |

Images need no configuration: service images uploaded by the developer are stored in MongoDB, and the bundled images are files in `client/public/images`.

## MongoDB Atlas setup

1. Create a free cluster at <https://cloud.mongodb.com>.
2. **Database Access** → add a user with *Read and write to any database* (a strong generated password).
3. **Network Access** → *Add IP Address* → **Allow access from anywhere** (`0.0.0.0/0`). Vercel functions use changing IP addresses, so they cannot be allow-listed individually.
4. **Connect → Drivers** → copy the connection string and add the database name:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/royal-fade?retryWrites=true&w=majority`
   (URL-encode special characters in the password.)
5. Put it in `MONGODB_URI`. Indexes (unique, TTL) are created automatically at start-up.

## SMTP (email) setup

Booking requires working email, because customers must verify their address with a code. Any SMTP provider works:

| Provider | `SMTP_HOST` | `SMTP_PORT` | `SMTP_SECURE` | Notes |
|---|---|---|---|---|
| Gmail | `smtp.gmail.com` | `587` | `false` | Needs 2-Step Verification and an **App Password** as `SMTP_PASS` |
| Brevo | `smtp-relay.brevo.com` | `587` | `false` | Free tier; use the SMTP key as password |
| Resend | `smtp.resend.com` | `465` | `true` | `SMTP_USER=resend`, API key as password |
| Local testing | `localhost` | `1025` | `false` | [Mailpit](https://mailpit.axllent.org) catches mail at <http://localhost:8025> |

`MAIL_FROM` should be an address your provider allows, e.g. `"Royal Fade <no-reply@yourdomain.com>"`. `OWNER_EMAIL` receives contact-form messages. If SMTP is missing the API still runs but the booking page explains that codes cannot be sent.

## Environment variables

### Server (`server/.env` locally, Vercel Environment Variables in production)

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | **yes** | MongoDB connection string including the database name |
| `JWT_SECRET` | **yes** | 32+ random characters. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `OTP_SECRET` | no | Separate 32+ char key for hashing codes (defaults to `JWT_SECRET`) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | for seeding | Business owner login created by `npm run seed` (password 10+ chars) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | **yes for booking** | See above |
| `OWNER_EMAIL` | recommended | Receives contact-form messages |
| `JWT_EXPIRES_IN` | no | Session length, default `8h` |
| `CLIENT_ORIGIN` | no | Extra browser origins allowed cross-origin (comma separated). **Not needed** when site and API are one Vercel project |
| `RATE_LIMIT_STORE` | no | `mongo` (default on Vercel) or `memory` (default locally) |
| `BUSINESS_PHONE`, `BUSINESS_EMAIL`, `BUSINESS_ADDRESS` | no | Override the demo contact details |
| `PORT` | local only | Default 5000 |
| `DEVELOPER_EMAIL`, `DEVELOPER_PASSWORD` | no | Only for a non-interactive `create-developer` run; normally leave unset |

### Client (`client/.env`, build-time, public)

| Variable | Description |
|---|---|
| `VITE_API_URL` | **Leave empty** locally and on Vercel (same domain). Set only if the API is hosted elsewhere |
| `VITE_WHATSAPP_NUMBER` | Digits with country code, e.g. `447700900123` |
| `VITE_MAPS_URL` | Google Maps link for "Get directions" |
| `VITE_MAPS_EMBED_URL` | Optional Google Maps embed `src` URL (empty = link only) |
| `VITE_INSTAGRAM_URL`, `VITE_FACEBOOK_URL`, `VITE_TIKTOK_URL` | Social links |

`VITE_*` values are bundled into public JavaScript, so never put secrets in them.

## Running the parts separately

If you prefer two terminals:

```bash
# 1. API on http://localhost:5000
cd server
npm run seed          # creates the 15 services and the business admin (safe to repeat)
npm run dev           # or: npm start

# 2. Website on http://localhost:5173 (proxies /api and /uploads to the API)
cd client
npm run dev
```

Or from the repo root: `npm run dev:server` and `npm run dev:client`. Production build: `npm run build`.

## Tests

```bash
# Server: unit tests always run; database tests run when MONGODB_TEST_URI is set
cd server
MONGODB_TEST_URI="mongodb://127.0.0.1:27017/royal-fade-test" npm test

# Client
cd client
npm test

# Everything
npm test          # from the repo root
```

> **`MONGODB_TEST_URI` must point to a throw-away database.** The tests empty its collections. Without it, database tests are skipped (and reported as skipped).

What is covered: login (admin and developer), wrong password, invalid / expired / forged tokens, logout invalidating the session; admin read-only services (create / update / delete / upload all 403); developer service management and zero access to appointments, messages and stats; booking without verification, wrong / expired / reused OTP, token reuse, email binding, double booking and concurrent requests, overlap, past dates, closed days, barber days off; admin cannot confirm an unverified booking; emails (content, failure handling, resend); seeding that never overwrites edits; developer provisioning rules; image upload validation; environment validation; the Vercel entry point, `vercel.json` routing and the production build; routing, the booking UI and role-based dashboards on the client.

## Accounts

### Business owner (admin)

Created **only** by the seed command, from environment variables:

```bash
# server/.env:  ADMIN_EMAIL=owner@yourshop.com   ADMIN_PASSWORD=<10+ characters>
cd server && npm run seed
```

Running it again is safe: it adds any missing services, never overwrites edited prices, descriptions or images, never touches a developer account, and only changes the admin password (signing out old sessions) if `ADMIN_PASSWORD` changed.

### Developer

Created **only** from a terminal. There is no registration page and no API for it.

```bash
cd server
npm run create-developer
# Developer email: you@example.com
# Developer password (hidden, 12+ characters):
# Repeat password:
```

- The password prompt is hidden, minimum 12 characters, stored as a bcrypt hash.
- The business admin email is refused (checked against the database *and* `ADMIN_EMAIL`).
- Running the command again for the same email **resets the password** and increments the session version, which signs out every existing developer session.

To run it against production, put the production `MONGODB_URI` in `server/.env` on your own machine (or set it for that one command) and run the same command. Vercel functions cannot run CLI tools.

## Roles and permissions

Defined in one file, `server/config/permissions.js`, and enforced by middleware on every dashboard route. The role is always read from the database, never from the token or the browser.

| Capability | Business owner | Developer |
|---|:-:|:-:|
| Dashboard statistics, appointments (view, search, filter) | ✅ | ❌ |
| Confirm / cancel / complete, resend emails | ✅ | ❌ |
| Contact messages (view, mark read) | ✅ | ❌ |
| Barber information | ✅ | ❌ |
| View service catalogue | ✅ (read-only) | ✅ |
| Add / edit / delete services, prices, descriptions | ❌ **403** | ✅ |
| Upload / replace service images | ❌ **403** | ✅ |

## Deploying to Vercel

One Vercel project serves everything: static site from `client/dist`, and `api/index.js` as a serverless function handling `/api/*` and `/uploads/*`. No code changes are needed.

1. **Push** the repository to GitHub (the `.gitignore` already excludes `.env` files and `node_modules`).
2. **MongoDB Atlas** and **SMTP**: set up as described above and keep the connection string and SMTP details at hand.
3. In Vercel choose **Add New → Project** and import the repository.
4. Leave **Root Directory** as the repository root. `vercel.json` already sets the install, build (`npm run build`) and output (`client/dist`) settings. If the **Framework Preset** is shown, choose **Other**.
5. Open **Environment Variables** and add (for *Production* and *Preview*):

   | Name | Value |
   |---|---|
   | `MONGODB_URI` | your Atlas connection string |
   | `JWT_SECRET` | a long random string (32+) |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | your provider |
   | `MAIL_FROM` | e.g. `Royal Fade <no-reply@yourdomain.com>` |
   | `OWNER_EMAIL` | where contact messages go |

   Do **not** set `VITE_API_URL` or `CLIENT_ORIGIN` (same domain). Optionally set the `VITE_*` social/WhatsApp/map variables. Use different secrets for Preview if you like; previews work on their own URLs without any CORS setup.
6. Click **Deploy**.
7. **Create the accounts** from your own computer (see [Accounts](#accounts)): put the *production* `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `server/.env`, then run `npm run seed` and `npm run create-developer` inside `server/`. Remove those values from the file afterwards.
8. Visit `https://<your-project>.vercel.app`, then `/admin/login`.

## Post-deployment configuration

- [ ] `https://<site>/api/health` returns `{"success":true,"status":"ok"}`.
- [ ] Home shows services (proves the database connection and seed).
- [ ] Make a test booking with your own email: you should receive the code, then the "request received" email.
- [ ] Sign in at `/admin/login` as the owner: confirm the booking and check the confirmation email arrives.
- [ ] Sign in as the developer: edit a service and upload an image; reload and redeploy to confirm it persists (images are stored in MongoDB).
- [ ] Add your **custom domain** in Vercel → Settings → Domains.
- [ ] Replace the demo address, phone, email and hours (see below), then redeploy.
- [ ] Use a sending domain with SPF / DKIM set up at your email provider so verification emails reach inboxes.

## Customising the business

| What | Where |
|---|---|
| Address, phone, email | `BUSINESS_ADDRESS`, `BUSINESS_PHONE`, `BUSINESS_EMAIL` env vars (or `server/config/business.js`) |
| Opening hours, closure dates (bank holidays), booking window, slot lengths | `server/config/business.js` |
| Barbers, bios, specialties, working hours, days off, holidays | `server/config/business.js` (`barbers`) |
| Social links, WhatsApp, map | `client/.env` (`VITE_*`) |
| Service catalogue | Developer dashboard (initial sample data: `server/services/serviceCatalog.js`) |
| Gallery | `client/src/config/gallery.js` |
| Policies and testimonials | `client/src/pages/Policies.jsx`, `Home.jsx` |

Hours and contact details come from the API, so the website, booking calendar and emails always agree. The bank-holiday list in `closedDates` is sample data: update it each year.

## Images

The design is built for **real barber photography**, but photographs cannot be generated or downloaded here, so every image is currently a simple generated placeholder (`client/scripts/generate-images.mjs`). Replace them with your own photos:

| What | File to add / replace |
|---|---|
| Home hero (full width, landscape, about 1920x1080) | `client/public/images/hero.jpg` (just add it; it is used automatically) |
| Gallery (12 images) | `client/public/images/gallery/` (keep the names or edit `client/src/config/gallery.js`) |
| Barber portraits | `client/public/images/barbers/marcus.svg`, `daniel.svg`, `liam.svg`, `tommy.svg` (use `.jpg` and edit the extension in `BarberCard.jsx`) |
| About page and Home about section | `client/public/images/shop.svg`, `about.svg` |
| Service images | the developer dashboard (Services → Edit → Upload), stored in MongoDB |

Uploaded service images must be JPG, PNG or WebP, **up to 4 MB** (Vercel limits request bodies to 4.5 MB).

## How booking and verification work

1. The page asks `/api/appointments/availability` for slots; the server removes closed days, past times, barbers who are off, and anything already locked.
2. `/api/verification/email/request` emails a code. `/api/verification/email/verify` checks it and returns a one-time token.
3. `/api/appointments` receives the booking **plus the token**. The server: validates input, loads the real service price and duration, checks the token belongs to that exact email and is unexpired and unused, re-checks availability, inserts one `SlotLock` per 15-minute block (the unique index is the concurrency guard; with *Any barber* it tries each free barber in turn), saves the appointment as Pending, marks the verification consumed, then emails the customer.
4. The owner confirms or cancels in the dashboard; cancelling releases the barber's time. Confirming is refused for any booking whose email was not verified.

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| Site loads but services are empty / "Cannot reach the server" | API not reachable. Visit `/api/health`. Locally, make sure the API runs on port 5000 (the Vite proxy targets it) |
| `/api/health` says "Server initialization failed" | Missing or invalid `MONGODB_URI` / `JWT_SECRET` in Vercel; check **Project → Settings → Environment Variables** and redeploy. Also check Atlas Network Access allows `0.0.0.0/0` |
| "We could not send the verification email" | SMTP settings wrong. For Gmail use an App Password. Check the Vercel function logs (they log only a short error code such as `EAUTH`) |
| Verification email never arrives | Spam folder; unverified sender domain. Use a provider with SPF/DKIM |
| Admin login always fails | Run `npm run seed` against the **same** database as the deployment; check `ADMIN_EMAIL` spelling |
| Services page is empty on a new database | Run `npm run seed` |
| `create-developer` says it must run in a terminal | Run it in an interactive terminal, not a pipe |
| Image upload fails with 413 | The file is over 4 MB, or the request exceeded Vercel's 4.5 MB limit; compress it |
| Page refresh gives 404 on Vercel | `vercel.json` must be at the repository root (it contains the SPA fallback) |
| Tests skip database cases | Set `MONGODB_TEST_URI` to a throw-away database |
| `Warning: this database does not support TTL indexes` | You are on a MongoDB-compatible test server. Real MongoDB and Atlas support them |

## Known limitations

- **Photography**: images are simple placeholders, to be replaced with real photos (see Images).
- **Rate limiting** uses MongoDB counters on Vercel. That is shared across instances, but is best-effort (a counter outage lets requests through rather than taking the site down).
- Booking requests are **pending** until the owner confirms; there is no online payment and no customer self-service cancellation (customers contact the studio, per the policy page).
- Barber and shop schedules are configuration files, not editable in the dashboard.
- Vercel serverless request bodies are limited to 4.5 MB, hence the 4 MB image cap.
- The policy pages and testimonials are sample text. Have policies reviewed before real use.

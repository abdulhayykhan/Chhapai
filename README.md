# Chhapai (چھپائی)

> **Walk-in QR-based self-service printing system for print shops in Pakistan.**

**Live Customer Web App:** [https://chhapai-web.vercel.app](https://chhapai-web.vercel.app)  
**Cloud Managed Database:** Supabase PostgreSQL (`ap-south-1` Mumbai)  
**Desktop App Mode:** Zero-Click Auto-Starting Server (Double-click app icon to start API + Counter App)

Chhapai eliminates the traditional, messy walk-in printing workflow in Pakistan (emailing files, passing USB drives, or WhatsApping documents to a crowded shop counter). 

Customers simply scan a counter QR code on their mobile phone, upload their document (`.pdf`, `.docx`, `.xlsx`, `.pptx`, `.jpg`, `.png`), customize print options (pages, copies, color vs. black & white, single vs. double-sided), see an instant transparent quote in Pakistani Rupees (PKR), and receive a short numeric token (e.g. `#042`). 

At the counter, the shopkeeper's Windows desktop app chimes, flashes, displays the document preview and price, and sends the job silently to the printer via SumatraPDF upon approval.

---

## 🏗️ Architecture & Monorepo Structure

Chhapai is built as a TypeScript monorepo using `pnpm` workspaces:

```
├── packages/
│   └── shared/          # Shared Zod schemas, enums, pricing math, state machine & Roman Urdu i18n
├── apps/
│   ├── api/             # NestJS 10 + Prisma 5 + PostgreSQL backend
│   ├── web/             # Next.js 14 App Router customer mobile portal
│   └── desktop/         # Electron 31 + React 18 counter operator app with SumatraPDF worker
├── docker/
│   ├── Dockerfile.api   # Debian bookworm-slim multi-stage build with headless LibreOffice & fonts
│   ├── Dockerfile.web   # Alpine multi-stage standalone Next.js build
│   ├── docker-compose.yml # Orchestration for Postgres, API, Web, and Caddy reverse proxy
│   ├── Caddyfile        # Reverse proxy with automated HTTPS and WebSocket proxying
│   └── backup.sh        # Nightly automated PostgreSQL backup with 7-day retention
├── docs/
│   ├── SETUP.md         # Production deployment, local development & installer guide
│   └── DECISIONS.md     # Architectural Decision Records (ADR 001 - 007)
└── pnpm-workspace.yaml
```

---

## 🚀 Key Features

### 1. Customer Mobile Experience (Roman Urdu)
- **Zero App Install:** Works completely in mobile web browsers (Safari, Chrome) via counter QR scan.
- **Roman Urdu Interface:** Native Pakistani vernacular (`ur-roman.json`) formatted Left-to-Right (LTR) for natural comprehension.
- **Universal File Support:** Upload `.pdf`, `.docx`, `.xlsx`, `.pptx`, `.jpg`, `.png` up to 50 MB.
- **Live Transparent Pricing:** Instant quote calculation powered by integer paisa arithmetic.
- **Live Status Polling:** Customer watches status transition in real-time (`PENDING_APPROVAL` ➔ `PRINTING` ➔ `COMPLETED`).

### 2. Desktop Counter App (Electron + React)
- **Real-Time Job Queue:** Incoming jobs stream via Socket.IO `/admin` namespace without polling.
- **Pleasant Chime & Alerts:** Custom HTML5 Web Audio chime, native Windows desktop notifications, and taskbar flashing when minimized.
- **Document Preview & Price Override:** High-fidelity PDF preview pane with editable final price override before approving.
- **Keyboard Shortcuts:** Fast counter operation:
  - `A` or `Enter`: Approve selected job
  - `R`: Reject selected job with canned reason modal
  - `Up` / `Down`: Navigate job queue
- **Daily Sales Report:** Instant daily summary (Total Jobs, Pages Printed, Revenue in PKR) with one-click CSV export.
- **Shop Settings & QR Poster:** Configure shop rates, select default B&W and Color printers, and print/download counter QR posters directly.
- **System Tray Minimization:** Minimizes to Windows system tray, continuing to listen for incoming print jobs in the background.

### 3. SumatraPDF Silent Print Worker
- **Deterministic Spooling:** Integrates `pdf-to-printer` bundling standalone SumatraPDF for silent, driver-independent printing on Windows.
- **Smart Routing:** Directs monochrome jobs to `bwPrinter` and color jobs to `colorPrinter`.
- **Hardware Mapping:** Accurate mapping of copies, page ranges (`1-5, 8`), and duplex modes (`simplex` vs `duplexlong`).
- **Atomic Job Claiming:** Backend row-level atomic locking (`WHERE id = :id AND status = 'APPROVED'`) returning HTTP 409 to prevent duplicate prints across multi-worker terminals.
- **Startup Backlog Sync:** Automatically checks and flushes unclaimed approved jobs if the counter app was closed or disconnected.
- **Error Recovery:** Catches printer errors (out of paper, spooler offline), marks job `FAILED`, and provides a one-click "Dubara Koshish" (Retry) action.

### 4. Hardened Production Infrastructure
- **LibreOffice Headless Conversion:** Multi-stage Debian container with disabled macro execution running under non-root unprivileged user `chhapai`.
- **Granular Rate Limiting:** `@nestjs/throttler` guards against abuse (Login: 5/min, Uploads: 10/hr, Job creation: 20/hr) plus 15-minute account lockout after 5 failed logins.
- **Automated Data Retention:** Scheduled cron runs every hour, purging stored PDF files older than configured retention hours (default: 24h) and marking uncollected jobs `CANCELLED`.
- **Automated HTTPS & WebSockets:** Caddy reverse proxy providing automatic ZeroSSL / Let's Encrypt certificates with HSTS and security headers.
- **Nightly Backups:** Automated `backup.sh` runs `pg_dump` with gzip compression and 7-day retention pruning.

---

## 🧪 Testing & Verification (PRD Section 16 Checklist)

All test suites pass across all packages and applications:

```bash
# Run unit & integration tests across monorepo (Vitest)
pnpm test

# Run mobile viewport customer E2E test (Playwright)
pnpm --filter @chhapai/web test:e2e

# Build all applications for production
pnpm build
```

### Test Results Breakdown:
- **`packages/shared`**: 28 passed (schemas, pricing math, page range parsing, state machine transitions).
- **`apps/api`**: 27 passed (auth & lockout, job lifecycle, rate limiting, cleanup cron, claim concurrency race condition).
- **`apps/desktop`**: 14 passed (desktop state, UI components, print worker, SumatraPDF option mapping, backlog sync).
- **`apps/web`**: 1 passed (Playwright customer mobile viewport E2E flow).
- **Total Test Count**: **70 / 70 tests passed**.

---

## 💻 Quickstart (Local Development)

### Prerequisites:
- Node.js 20+
- `pnpm` 9+ (`npm install -g pnpm`)
- PostgreSQL 16 (local or Docker)
- Windows 10/11 (for desktop app printing tests)

### 1. Clone & Install
```bash
git clone https://github.com/abdulhayykhan/Chhapai.git
cd Chhapai
pnpm install
```

### 2. Configure Environment
```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

### 3. Initialize Database
```bash
cd apps/api
pnpm prisma migrate deploy
pnpm prisma db seed
cd ../..
```
*Default Seed Credentials:*
- **Username:** `admin`
- **Password:** `Admin123!`
- **Shop Slug:** `al-madina-photostat` (URL: `http://localhost:3000/s/al-madina-photostat`)

### 4. Run Development Servers
```bash
# Run API and Customer Web App
pnpm --filter @chhapai/api start:dev
pnpm --filter @chhapai/web dev

# In another terminal, run Desktop Counter App
pnpm --filter @chhapai/desktop dev
```

---

## 📦 Packaging Desktop App (Windows Installer)

The desktop app packages into a standalone Windows NSIS installer (`.exe`) with unpacked SumatraPDF binaries:

```bash
cd apps/desktop
pnpm run build
pnpm run package
```
Output installer will be generated in `apps/desktop/dist-electron/Chhapai Setup 1.0.0.exe`.

---

## 🌐 Production VPS Deployment

Refer to [`docs/SETUP.md`](docs/SETUP.md) for the complete, step-by-step production deployment guide covering:
1. Docker Compose setup for API, Web, Postgres, and Caddy.
2. Production domain configuration with automated HTTPS.
3. Automated database backups setup via crontab.
4. Setting up Desktop App auto-start on Windows counter terminals.

---

## 📑 Architectural Decision Records (ADRs)

See [`docs/DECISIONS.md`](docs/DECISIONS.md) for detailed design rationales:
- **Decision 001:** Language Simplification to Roman Urdu (`ur-roman.json`).
- **Decision 002:** Monorepo Structure & Package Management (`pnpm`).
- **Decision 003:** Integer Paisa Math for Quotes and Pricing.
- **Decision 004:** Atomic Row-Level Job Claiming (HTTP 409 transition conflict).
- **Decision 005:** Outbound-Only Desktop Counter Architecture (CGNAT friendly).
- **Decision 006:** SumatraPDF Silent Printing Engine Integration.
- **Decision 007:** Headless LibreOffice in Multi-Stage Docker.

---

## 🗺️ Roadmap

- **Phase 2:** Online payments (JazzCash, Easypaisa QR), WhatsApp/SMS notifications, phone number OTP, multi-file batch upload, auto-updater for desktop installer, S3/Cloudflare R2 object storage.
- **Phase 3:** Multi-shop SaaS portal (shopkeeper self-registration, custom per-shop branding, subscription billing), multi-printer fleet load balancing, and advanced retail analytics.

---

## 📄 License
Private & Proprietary — Developed for Chhapai Print Services.

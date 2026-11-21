# Chhapai (چھپائی)

Self-Service Walk-In Printing Platform for Retail Print Shops in Pakistan.
Architected and developed by Abdul Hayy Khan (https://abdulhayykhan.dev).

Production Web Application: https://chhapai-web.vercel.app
GitHub Repository: https://github.com/abdulhayykhan/Chhapai
Latest Windows Installer Release: https://github.com/abdulhayykhan/Chhapai/releases/tag/v1.0.0
Author Portfolio: https://abdulhayykhan.dev

---

## 1. Executive Summary

Chhapai is an open-source, walk-in printing platform engineered to modernize and streamline the retail print shop ecosystem in Pakistan. Traditional photocopying and computer printing shops across Pakistani urban centers and university campuses suffer from operational friction: customers crowd counter desks, hand over virus-infected USB thumb drives, or send sensitive personal documents over unencrypted consumer messaging channels like WhatsApp.

Chhapai replaces this manual chaos with a friction-free, zero-install customer experience and a deterministic, silent print engine for shopkeepers. Customers scan a physical QR code posted at the shop counter, upload their documents directly from their mobile browser, configure page selections and color options, inspect an exact quote calculated in Pakistani Rupees (PKR), and receive an automated short token (such as #042).

On the shopkeeper side, an Electron-based desktop application monitors the incoming queue via persistent real-time WebSockets. When a customer submits a job, the counter terminal sounds an audible chime, brings the preview to the front, and upon shopkeeper verification, silently dispatches the job directly to the designated physical printer using an embedded SumatraPDF binary without invoking Windows print dialogs.

The system is configured to run on a 100% free-tier operational model combining Supabase cloud PostgreSQL, Vercel edge deployment for the customer mobile interface, and an embedded zero-click background server manager inside the desktop application that eliminates cloud server costs and cold-start latencies.

---

## 2. Background and Problem Statement

### 2.1 The Traditional Print Shop Workflow in Pakistan

Retail print shops in Pakistan (commonly referred to as "Photostat and Printing" shops) handle hundreds of walk-in transactions daily from university students, legal professionals, corporate workers, and citizens needing government documentation. The standard operational flow suffers from severe structural vulnerabilities:

1. USB Thumb Drive Contamination: Customers bring USB flash drives containing assignments, resumes, or national identity documents. Shop counter computers frequently suffer from malware infections, Trojan droppers, and file shortcut worms transmitted through infected customer drives.
2. WhatsApp and Bluetooth Overhead: Customers are asked to add the shopkeeper's personal mobile phone number to WhatsApp to transmit PDF or DOCX files. This exposes the shopkeeper's personal contact details, clutters phone storage, creates customer privacy risks, and causes confusion over document versions.
3. Lack of Pricing Transparency: Retail print pricing varies depending on single-sided versus double-sided paper use, black and white versus color toner, and page ranges. Misunderstandings between customers and counter staff regarding final page counts and price calculations frequently lead to counter disputes.
4. Spooling Waterfalls and Bottlenecks: Counter operators must manually download files, launch Microsoft Word or Adobe Acrobat, press Ctrl+P, configure print settings (duplex, page numbers, color mode), select the appropriate physical printer, and confirm print dialogs. This manual overhead creates long physical queues during peak hours.

### 2.2 The Chhapai Solution

Chhapai eliminates these bottlenecks through four core engineering interventions:

1. Zero-Install Mobile Customer Portal: Operates completely inside mobile web browsers (Safari, Chrome) via QR code scan. No account creation, app download, or phone number authentication is required for basic walk-in usage.
2. Roman Urdu Vernacular Interface: Built specifically for local comprehension in Pakistan, using Roman Urdu terminology ("File Upload Karein", "Black & White", "Copies Ki Tadaad", "Raqam") formatted Left-to-Right (LTR) for natural interaction.
3. Automated Document Ingestion and Conversion: Headless conversion running in a secure, macro-disabled sandbox converts DOCX, XLSX, PPTX, and image formats into standardized PDF files while strictly counting pages for pricing.
4. Deterministic Silent Print Spooling: An embedded SumatraPDF worker automatically claims approved print jobs, sets hardware duplex and copy flags, routes monochrome jobs to black-and-white printers and multi-color jobs to designated color printers, and delivers silent output with zero human dialog interaction.

---

## 3. System Architecture and Design Patterns

Chhapai is architected as an integrated TypeScript monorepo managed with pnpm workspaces. The architecture decouples the customer-facing interface, the administrative API, and the desktop hardware bridge while sharing strong Zod schemas, state machines, and business rules.

```
Chhapai Monorepo Topology
====================================================================
packages/shared/         Shared schemas, enums, integer math & i18n
apps/api/                NestJS 10 backend + Prisma ORM + Socket.IO
apps/web/                Next.js 14 App Router customer mobile portal
apps/desktop/            Electron 31 + React 18 counter app & worker
docker/                  Containerization (Dockerfile.api, web, compose)
docs/                    Architecture Decision Records & deployment specs
.github/workflows/       Automated Windows installer CI/CD pipeline
====================================================================
```

### 3.1 Architectural Flow Diagram

```
+-------------------------------------------------------------------------+
| Customer Device (Mobile Browser)                                        |
| 1. Scans Counter QR Code -> Opens https://chhapai-web.vercel.app/s/slug |
| 2. Uploads Document (PDF, DOCX, JPG) -> Direct upload to API           |
| 3. Configures Options (Copies, Color, Duplex, Page Range)              |
| 4. Receives Live Integer Paisa PKR Quote                                |
| 5. Submits Job -> Obtains Numeric Token (e.g., #042)                   |
| 6. Polls /api/v1/public/jobs/:token for real-time status transitions    |
+-------------------------------------------------------------------------+
                                    |
                                    v HTTPS / WSS
+-------------------------------------------------------------------------+
| Shopkeeper Desktop Terminal (Electron App)                              |
| - Double-click Chhapai.Setup.1.0.0.exe to launch                       |
| - Embedded Server Manager checks port 3001 and spawns API child process |
| - Connects to Supabase Cloud PostgreSQL (aws-0-ap-south-1.pooler)      |
| - Listens on Socket.IO namespace /admin for real-time incoming jobs     |
| - Renders Document Preview, Editable Price Override & Keyboard Hotkeys  |
| - Spools claimed jobs silently to physical printer via SumatraPDF binary|
+-------------------------------------------------------------------------+
```

---

## 4. Technology Stack and Technical Rationale

| Layer | Technology | Version | Technical Justification |
| :--- | :--- | :--- | :--- |
| Workspace Management | pnpm | 12.x / 9.x | Strict dependency isolation, shared symlinks, rapid CI/CD build caching across packages. |
| Language & Typing | TypeScript | 5.7+ | End-to-end type safety spanning database entities, HTTP contracts, and WebSocket events. |
| Schema Validation | Zod | 3.24+ | Single source of truth for runtime validation in shared package, API DTOs, and web forms. |
| Customer Web App | Next.js (App Router) | 14.2+ | Server-side rendering, instant mobile viewport optimization, Tailwind CSS styling. |
| Administrative API | NestJS | 10.4+ | Modular architecture, native dependency injection, decorators, Throttler rate limiting. |
| Database & ORM | PostgreSQL + Prisma | 16 / 5.22+ | ACID compliance, row-level atomic locking, automated migrations and type-safe client. |
| Real-Time Transport | Socket.IO | 4.8+ | WebSocket abstraction with automatic reconnection, heartbeat pings, and event rooms. |
| Desktop Shell | Electron | 31.7+ | Cross-process isolation, native Windows taskbar flashing, system tray, audio chiming. |
| Silent Print Engine | SumatraPDF (pdf-to-printer) | Bundled | Driver-independent, command-line silent spooling without Acrobat licensing costs. |
| Testing Suites | Vitest + Playwright | 2.1 / 1.49 | Lightning-fast ESM unit testing and end-to-end mobile browser automation. |

---

## 5. Detailed Component Catalog

### 5.1 Shared Package (`packages/shared`)

The shared library contains pure, environment-agnostic business logic compiled to ECMAScript modules and TypeScript declarations:

- Zod Validation Schemas: Contracts defining job submissions, shop configuration updates, upload metadata, and quote queries.
- State Machine Transitions: Finite state machine governing legal job status progressions (`PENDING_APPROVAL` -> `APPROVED` -> `PRINTING` -> `COMPLETED`).
- Integer Paisa Pricing Mathematics: Avoids floating-point precision errors by performing all financial computations in integer paisas (1 PKR = 100 paisas) before dividing for human-readable display.
- Page Range Parsing Engine: Lexical parser that expands complex page ranges (such as `1-3, 5, 8-10`) into validated arrays of unique page indices while rejecting out-of-bounds inputs.
- Roman Urdu Internationalization: Vernacular dictionary translating operational terms into localized Pakistani terminology.

### 5.2 Customer Web Portal (`apps/web`)

The customer mobile portal is optimized for 360px-420px mobile viewports:

- Zero Account Overhead: Customers do not register or maintain profiles; transactions are anchored to short-lived anonymous public tokens.
- Dynamic Upload Box: Supports direct file selection and drag-and-drop with client-side file size guardrails before streaming uploads.
- Quick Stepper Controls: Dedicated buttons and quick presets (1, 2, 3, 5, 10) for copies selection.
- Visual Swatches: High-contrast toggles for monochrome versus full-color printing and single versus double-sided paper duplexing.
- Transparent Real-Time Quote: Instant calculation breakdown demonstrating page counts multiplied by copy quantities and base rates.
- Sticky Action Bar: Floating frosted-glass container with live price summary and submission button.
- Hero Token Display: Prominent high-contrast token banner with a one-click clipboard copy utility.
- Live Status Tracker: Progressive visual timeline tracking submission, operator approval, active printing, and collection readiness.
- Active Order Recovery: Stores the latest order metadata in browser localStorage so returning customers can instantly recover their active token status.

### 5.3 Backend API Service (`apps/api`)

The backend API handles authentication, business validation, file storage, and hardware orchestration:

- Modular NestJS Architecture: Separated into dedicated modules for Auth, Shops, Uploads, Jobs, Quotes, and Scheduled Tasks.
- Database Entity Relationships: Models Shops, Users (Shopkeepers/Operators), PrintJobs, Uploads, PrintLogs, and AuditEvents.
- Security and Rate Limiting: Built-in throttler prevents abuse by capping authentication attempts (5 per minute), file uploads (10 per hour per IP), and quote requests.
- Account Lockout Protocol: Automatically locks administrative accounts for 15 minutes following 5 consecutive incorrect password submissions.
- Scheduled Maintenance Cron: An hourly background task cleans up orphaned uploaded files older than configured retention limits (default 24 hours) and marks stale uncollected orders as expired.
- Concurrency Safe Job Claiming: Uses atomic SQL conditional updates (`UPDATE "PrintJob" SET status = 'APPROVED' WHERE id = :id AND status = 'PENDING_APPROVAL'`) returning HTTP 409 Conflict if a multi-terminal counter tries to double-claim the same job.

### 5.4 Counter Desktop Application (`apps/desktop`)

The counter application gives shopkeepers complete command of the retail printing floor:

- Zero-Click Embedded Server Manager: Automatically inspects port 3001 upon desktop startup. If inactive, it spawns the compiled NestJS API as a background Node child process, passing production Supabase database credentials.
- Real-Time Queue Synchronization: Maintains an active WebSocket connection to the `/admin` namespace, refreshing incoming orders instantly.
- Auditory Chimes and Taskbar Alerts: Generates Web Audio chimes upon job arrival, flashes the Windows taskbar, and triggers native Windows notifications when minimized.
- Document Preview Panel: Embeds an interactive PDF preview viewer allowing the operator to verify formatting before consuming paper.
- Price Override Capability: Allows the shopkeeper to modify the calculated price for custom customer requirements before final approval.
- Ergonomic Keyboard Accelerators: Enables rapid counter operation through hotkeys:
  - `A` or `Enter`: Approve selected job for printing.
  - `R`: Open rejection dialog with quick-pick reasons.
  - `Arrow Up` / `Arrow Down`: Navigate through queue items.
- Daily Sales Analytics: Computes real-time metrics (Total Orders, Total Pages Printed, Gross Revenue in PKR, Monochrome vs Color Split) with one-click CSV report export.
- Counter QR Code Generator: Generates, previews, and prints high-resolution SVG and PNG counter posters customized with the shop's name, phone, and direct URL.
- Windows System Tray Integration: Minimizes cleanly to the Windows notification tray, continuing background monitoring without cluttering the taskbar.

### 5.5 Hardware Print Spooler (`pdf-to-printer` & SumatraPDF)

The silent print worker executes physical paper output deterministically:

- Standalone Native Binaries: Bypasses standard Windows GDI dialogs by executing pre-compiled SumatraPDF commands with command-line flags.
- Hardware Feature Mapping: Translates job options into physical hardware instructions:
  - Monochrome versus Color: Automatically routes monochrome documents to designated black-and-white printers and multi-color documents to color-capable devices.
  - Duplex Options: Maps single-sided to `simplex` and double-sided to `duplexlong`.
  - Page Ranges: Passes validated comma-separated page subsets directly to the print spooler.
- Startup Backlog Recovery: If the desktop app was closed while approved jobs remained unprinted, the print worker scans the database on startup, claims any pending backlog, and spools them in sequential order.
- Error Interception: Catches operating system spooler failures (paper jams, spooler offline, out of toner), flags the job status as `FAILED`, and provides a one-click manual retry interface.

---

## 6. Zero-Cost Cloud & Embedded Local Hybrid Topology

To guarantee zero ongoing server bills for small shopkeepers in Pakistan, Chhapai implements a hybrid topology that decouples compute, storage, and database layers across free tiers:

```
+-------------------------------------------------------------------------+
| Customer Web Portal                                                     |
| Hosted on Vercel Free Edge Tier                                         |
| Global CDN delivery, instant SSL, zero cold starts                     |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
| Managed Cloud Database                                                  |
| Hosted on Supabase Free Tier (Region: ap-south-1 Mumbai)                 |
| PostgreSQL 16 accessed via IPv4 Session Pooler (port 5432)              |
| Stores shop configuration, daily sales, users, and print job metadata   |
+-------------------------------------------------------------------------+
                                    ^
                                    |
+-------------------------------------------------------------------------+
| Counter PC (Shopkeeper Terminal)                                        |
| Electron Desktop App wraps:                                            |
| 1. Embedded NestJS API runtime running locally on port 3001             |
| 2. Local disk file caching for active PDF print processing              |
| 3. Local SumatraPDF binary communicating directly with USB / LAN printer|
+-------------------------------------------------------------------------+
```

### 6.1 Rationale for Avoiding Third-Party Free Containers

Early evaluation considered hosting the API on free container platforms like Render or Hugging Face Spaces:
- Render Free Tier: Automatically spins down web services after 15 minutes of inactivity, resulting in cold starts of 40-50 seconds and dropped WebSocket connections that disrupt walk-in retail operations.
- Hugging Face Spaces: Transitioned Docker Spaces to paid tiers, returning HTTP 402 Payment Required for automated container deployments.

Chhapai solves this by utilizing the shopkeeper's physical Windows PC as the API execution engine through Electron's background process management. The shopkeeper simply double-clicks the application icon, and the API, database connection, and printer drivers initialize automatically.

---

## 7. Monorepo Directory Organization

```
Chhapai/
├── .github/
│   └── workflows/
│       └── release.yml          # Automated Windows installer release pipeline
├── apps/
│   ├── api/                     # NestJS 10 backend API
│   │   ├── prisma/              # Prisma schema, migrations, seeders
│   │   ├── src/                 # Controllers, services, gateways, guards
│   │   └── test/                # API unit and integration test specs
│   ├── desktop/                 # Electron desktop application
│   │   ├── src/
│   │   │   ├── main/            # Electron main process & serverManager
│   │   │   ├── preload/         # Context bridge IPC definitions
│   │   │   └── renderer/        # React 18 UI components, state, hooks
│   │   └── tests/               # Desktop state and print worker tests
│   └── web/                     # Customer mobile web portal (Next.js 14)
│       ├── e2e/                 # Playwright mobile viewport end-to-end tests
│       └── src/
│           └── app/             # Next.js App Router pages and layouts
├── docker/
│   ├── Dockerfile.api           # Debian container with LibreOffice headless
│   ├── Dockerfile.web           # Standalone Next.js container
│   ├── docker-compose.yml       # Production self-hosting orchestration
│   ├── Caddyfile                # Automatic HTTPS reverse proxy config
│   └── backup.sh                # Automated database backup script
├── docs/
│   ├── DECISIONS.md             # Architectural Decision Records (ADR 001 - 009)
│   └── SETUP.md                 # Production deployment & operations handbook
├── packages/
│   └── shared/                  # Shared Zod schemas, integer math, types, i18n
├── package.json                 # Monorepo root manifest
├── pnpm-workspace.yaml          # Monorepo workspace configuration
└── README.md                    # Technical documentation
```

---

## 8. Comprehensive Automated Testing Pyramid

Chhapai maintains strict test coverage across all layers of the monorepo. All 70 automated tests pass consistently:

```
====================================================================
Test Suite Breakdown                               Status      Count
====================================================================
packages/shared: Unit Tests (Vitest)                PASSED         28
  - tests/schemas.test.ts (Input validation)        Passed          5
  - tests/pricing.test.ts (Integer paisa math)      Passed          6
  - tests/page-range.test.ts (Page list parsing)    Passed         11
  - tests/state-machine.test.ts (State transitions) Passed          6
--------------------------------------------------------------------
apps/api: Integration & Unit Tests (Vitest)          PASSED         27
  - test/auth.spec.ts (Auth & lockout protocol)     Passed          3
  - test/public.spec.ts (Shop public metadata)      Passed          5
  - test/admin.spec.ts (Job approval & updates)     Passed          8
  - test/conversion.spec.ts (File processing)       Passed          6
  - test/cron.spec.ts (Hourly data retention purge) Passed          3
  - test/token.spec.ts (Atomic claim conflict 409)  Passed          2
--------------------------------------------------------------------
apps/desktop: Desktop UI & Worker Tests (Vitest)    PASSED         14
  - tests/desktop-state.test.ts (State handling)    Passed          4
  - tests/print-worker.test.ts (SumatraPDF worker)  Passed          6
  - tests/components.test.tsx (Header, modals, UI)  Passed          4
--------------------------------------------------------------------
apps/web: End-to-End Tests (Playwright)             PASSED          1
  - e2e/customer-flow.spec.ts (Mobile workflow)     Passed          1
====================================================================
Total Automated Tests Passing:                                     70
====================================================================
```

### Executing Test Suites

```bash
# Run all unit and integration test suites across monorepo
pnpm test

# Run customer mobile end-to-end test suite
pnpm --filter @chhapai/web test:e2e
```

---

## 9. Local Development Setup Manual

### 9.1 System Prerequisites

Before running the application locally, ensure your system has the following dependencies installed:

- Node.js: Version 20.x or 24.x LTS.
- pnpm: Version 9.x or higher (`npm install -g pnpm`).
- Git: Version 2.40+ installed and configured.
- Operating System: Windows 10/11 is required to test native SumatraPDF hardware spooling. (Linux and macOS can run API and Web components).

### 9.2 Clone and Install Dependencies

```bash
git clone https://github.com/abdulhayykhan/Chhapai.git
cd Chhapai
pnpm install
```

### 9.3 Environment Configuration

Copy the example environment configuration files:

```bash
# Root environment configuration
cp .env.example .env

# Backend API environment configuration
cp apps/api/.env.example apps/api/.env
```

Ensure `apps/api/.env` contains valid database credentials:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chhapai_dev"
JWT_SECRET="development_jwt_secret_key_minimum_32_characters"
PORT=3001
CORS_ORIGIN="http://localhost:3000,http://localhost:5173"
FILE_UPLOAD_DIR="../../uploads"
```

### 9.4 Database Initialization & Seeding

```bash
cd apps/api
pnpm prisma migrate deploy
pnpm prisma db seed
cd ../..
```

Default seeded credentials for initial login:
- URL: `http://localhost:3000/s/al-madina-photostat`
- Administrative Email: `admin@chhapai.com`
- Administrative Password: `Admin123!`
- Default Shop Name: `Al-Madina Photostat & Printing`

### 9.5 Running Development Servers

Launch all services concurrently or in separate terminals:

```bash
# Terminal 1: Backend API
pnpm --filter @chhapai/api start:dev

# Terminal 2: Customer Mobile Web Portal
pnpm --filter @chhapai/web dev

# Terminal 3: Desktop Counter Application
pnpm --filter @chhapai/desktop dev
```

---

## 10. Packaging & Releasing the Windows Desktop Application

The desktop application is packaged using `electron-builder` into a self-contained NSIS installer (`.exe`) that bundles all required application code, unpacked native print binaries, and assets.

### 10.1 Local Compilation

```bash
# Build all prerequisite packages
pnpm --filter @chhapai/shared build
pnpm --filter @chhapai/api build

# Package desktop installer
cd apps/desktop
pnpm run build
pnpm run package
```

The compiled installer will be generated in `apps/desktop/release/Chhapai Setup 1.0.0.exe`.

### 10.2 Automated GitHub Actions Release Workflow

Chhapai includes an automated GitHub Actions release workflow configured in `.github/workflows/release.yml`. When a version tag (such as `v1.0.0`) is pushed to the repository, the runner:

1. Provisions a clean Windows runner (`windows-latest`).
2. Checks out the repository, installs Node.js and pnpm.
3. Installs dependencies and builds `@chhapai/shared` and `@chhapai/api`.
4. Runs `electron-builder --win --publish never` to build `Chhapai Setup 1.0.0.exe`.
5. Uploads the executable directly to GitHub Releases under the matching tag.

---

## 11. Architectural Decision Records (ADRs) Summary

| Decision ID | Title | Summary of Architectural Choice |
| :--- | :--- | :--- |
| ADR 001 | Roman Urdu Vernacular | Standardized on Roman Urdu (`ur-roman.json`) formatted Left-to-Right for optimal local comprehension. |
| ADR 002 | Monorepo Structure | Selected pnpm workspaces over separate repositories to share schemas, types, and build configs. |
| ADR 003 | Integer Paisa Math | All currency calculations executed in integer paisas to prevent floating-point financial discrepancies. |
| ADR 004 | Atomic Job Claiming | Implemented atomic database row conditional locking returning HTTP 409 to prevent duplicate prints. |
| ADR 005 | Outbound Only Desktop | Desktop communicates exclusively via outbound WebSockets and HTTPS, eliminating router port-forwarding. |
| ADR 006 | SumatraPDF Silent Engine | Integrated SumatraPDF through `pdf-to-printer` for silent, scriptable Windows printer spooling. |
| ADR 007 | LibreOffice Headless | Isolated document conversion in a dedicated unprivileged sandbox with macros permanently disabled. |
| ADR 008 | 70-Test QA Pyramid | Established complete test coverage across shared, api, desktop, and web components. |
| ADR 009 | Zero-Click Embedded Model | Switched from paid cloud containers to an Electron-managed local API connected to Supabase cloud database. |

---

## 12. Security Architecture & Data Protection

Chhapai adheres to data protection principles tailored for retail walk-in operations:

1. Macro-Disabled Sandbox Execution: Customer documents (`.docx`, `.xlsx`, `.pptx`) are converted using LibreOffice in headless mode with all VBA macros disabled, neutralizing document-borne macro malware.
2. Automated File Retention Purging: Document files stored locally or on disk are automatically deleted by an hourly cleanup cron once jobs are marked completed or after 24 hours of inactivity.
3. Cryptographic Storage: Sensitive tokens, administrator passwords, and database connection strings are encrypted on disk using Electron's `safeStorage` API, which leverages Windows Data Protection API (DPAPI).
4. No Customer Data Retention: Anonymous walk-in customers do not have permanent database user records created; jobs are linked strictly to temporary anonymous tokens.

---

## 13. Author and Credits

Chhapai was conceived, architected, and built by Abdul Hayy Khan.

- Personal Portfolio: https://abdulhayykhan.dev
- GitHub Profile: https://github.com/abdulhayykhan
- Project Repository: https://github.com/abdulhayykhan/Chhapai

---

## 14. License

This software is released as an open-source project under the MIT License.
Copyright 2026 Abdul Hayy Khan. Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files, to deal in the Software without restriction.

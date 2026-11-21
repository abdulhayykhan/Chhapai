# Chhapai (چھپائی)

**Self-Service Walk-In Printing Platform for Retail Print Shops in Pakistan.**  
Architected and developed by [Abdul Hayy Khan](https://abdulhayykhan.dev).

---

[![Live Web Application](https://img.shields.io/badge/Customer_Portal-chhapai--web.vercel.app-1D4ED8?style=for-the-badge&logo=vercel&logoColor=white)](https://chhapai-web.vercel.app)
[![Windows Installer](https://img.shields.io/badge/Windows_Desktop_Installer-v1.0.0_Release-0284C7?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/abdulhayykhan/Chhapai/releases/tag/v1.0.0)
[![Automated Verification](https://img.shields.io/badge/Automated_Tests-70%2F70_Passing-16A34A?style=for-the-badge)](https://github.com/abdulhayykhan/Chhapai/actions)
[![License](https://img.shields.io/badge/License-MIT-0F172A?style=for-the-badge)](LICENSE)
[![Author](https://img.shields.io/badge/Developer-Abdul_Hayy_Khan-4338CA?style=for-the-badge)](https://abdulhayykhan.dev)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.4-E0234E?style=flat-square&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Electron](https://img.shields.io/badge/Electron-31.7-47848F?style=flat-square&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Supabase](https://img.shields.io/badge/Supabase-ap--south--1-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-5.22-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-010101?style=flat-square&logo=socket.io&logoColor=white)](https://socket.io/)
[![pnpm](https://img.shields.io/badge/pnpm-Workspaces-F69220?style=flat-square&logo=pnpm&logoColor=white)](https://pnpm.io/)

---

### Quick Navigation

- [1. Executive Summary](#1-executive-summary)
- [2. Problem Statement in the Pakistani Context](#2-problem-statement-in-the-pakistani-context)
- [3. System Architecture & Topology](#3-system-architecture--topology)
- [4. Complete Technology Stack Matrix](#4-complete-technology-stack-matrix)
- [5. Deep Component Breakdown](#5-deep-component-breakdown)
  - [Shared Core Package (`packages/shared`)](#51-shared-core-package-packagesshared)
  - [Customer Mobile Portal (`apps/web`)](#52-customer-mobile-portal-appsweb)
  - [Administrative Backend Service (`apps/api`)](#53-administrative-backend-service-appsapi)
  - [Counter Terminal Desktop Application (`apps/desktop`)](#54-counter-terminal-desktop-application-appsdesktop)
  - [Hardware Silent Spooler Engine (`SumatraPDF`)](#55-hardware-silent-spooler-engine-sumatrapdf)
- [6. Zero-Cost Free Operational Model](#6-zero-cost-free-operational-model)
- [7. Monorepo Organization](#7-monorepo-organization)
- [8. Automated Testing Pyramid (70/70)](#8-automated-testing-pyramid-7070)
- [9. Setup & Development Guide](#9-setup--development-guide)
- [10. Packaging & Windows Release Workflow](#10-packaging--windows-release-workflow)
- [11. Architectural Decision Records (ADRs)](#11-architectural-decision-records-adrs)
- [12. Security & Data Protection](#12-security--data-protection)
- [13. Author & Credits](#13-author--credits)
- [14. License](#14-license)

---

## 1. Executive Summary

Chhapai is an open-source, walk-in printing platform engineered to modernize and streamline the retail print shop ecosystem in Pakistan. Traditional photocopying and computer printing shops across Pakistani commercial markets and university campuses suffer from severe operational friction: customers crowd counter desks, hand over virus-infected USB drives, or send sensitive personal documents over unencrypted consumer messaging apps like WhatsApp.

Chhapai replaces this manual chaos with a friction-free, zero-install customer experience and a deterministic, silent print engine for shopkeepers:

1. Customer Mobile Experience: Customers scan a counter QR code, upload documents directly from their mobile browser, configure page selections and color options, inspect an exact quote calculated in Pakistani Rupees (PKR), and receive an automated short token (such as `#042`).
2. Shopkeeper Desktop Terminal: An Electron-based desktop application monitors the queue via persistent real-time WebSockets. When a customer submits a job, the counter terminal sounds an audible chime, brings the preview forward, and upon verification, silently dispatches the job directly to the designated physical printer using an embedded SumatraPDF binary without invoking Windows print dialogs.
3. 100% Free Operational Model: Designed for zero monthly server overhead by combining Supabase cloud PostgreSQL, Vercel edge deployment for the customer interface, and an embedded zero-click background server manager inside the desktop app that eliminates cloud server fees and cold-start latencies.

> [!NOTE]
> Chhapai is production-ready, featuring 70/70 passing automated tests across unit, integration, and Playwright mobile viewport end-to-end suites.

---

## 2. Problem Statement in the Pakistani Context

### 2.1 The Traditional Retail Print Shop Workflow

Retail print shops in Pakistan (locally known as Photostat & Printing shops) handle hundreds of walk-in transactions daily from university students, legal professionals, corporate workers, and citizens needing government documentation. The standard operational workflow suffers from four major structural vulnerabilities:

```
+-------------------------------------------------------------------------------+
|                      TRADITIONAL VULNERABILITIES                              |
+-------------------------------------------------------------------------------+
| [1] USB Drive Viruses      Infected customer flash drives contaminate counter |
|                            terminals with Trojan droppers and shortcut worms. |
| [2] WhatsApp Bottlenecks   Shopkeepers must share personal phone numbers,     |
|                            cluttering phone storage and leaking contact info. |
| [3] Price Misunderstandings Disputes over single vs double-sided page rates,  |
|                            color toner pricing, and manual calculation errors.|
| [4] Manual Print Dialogs   Operators manually open files in Word/Acrobat,    |
|                            configure duplex and page numbers, slowing queues. |
+-------------------------------------------------------------------------------+
```

### 2.2 The Chhapai Intervention

Chhapai eliminates these bottlenecks through four dedicated engineering interventions:

- Zero-Install Mobile Portal: Operates completely inside mobile web browsers (Safari, Chrome) via QR code scan. No account creation, app download, or phone number authentication is required for basic walk-in usage.
- Roman Urdu Vernacular Interface: Built specifically for local comprehension in Pakistan, using Roman Urdu terminology (`File Upload Karein`, `Black & White`, `Copies Ki Tadaad`, `Kul Raqam`) formatted Left-to-Right (LTR) for natural interaction.
- Automated Document Ingestion and Conversion: Headless conversion running in a secure, macro-disabled sandbox converts DOCX, XLSX, PPTX, and image formats into standardized PDF files while strictly counting pages for pricing.
- Deterministic Silent Print Spooling: An embedded SumatraPDF worker automatically claims approved print jobs, sets hardware duplex and copy flags, routes monochrome jobs to black-and-white printers and multi-color jobs to designated color printers, and delivers silent output with zero human dialog interaction.

---

## 3. System Architecture & Topology

Chhapai is architected as an integrated TypeScript monorepo managed with pnpm workspaces. The architecture decouples the customer-facing interface, administrative API, and desktop hardware bridge while sharing strong Zod schemas, state machines, and business rules.

```
+-----------------------------------------------------------------------------+
|                     CUSTOMER MOBILE BROWSER INTERFACE                       |
|                 Hosted on Vercel Edge: chhapai-web.vercel.app               |
|                                                                             |
|  - Scans Shop Counter QR Code                                               |
|  - Uploads Document (PDF, DOCX, XLSX, PPTX, JPG, PNG)                       |
|  - Configures Copies, Color Mode, Duplex (Single/Double), Page Range        |
|  - Receives Live Integer Paisa PKR Quote Calculation                        |
|  - Receives Numeric Token (e.g., #042)                                      |
|  - Polls /api/v1/public/jobs/:token for real-time state changes             |
+-----------------------------------------------------------------------------+
                                      |
                           HTTPS REST | Real-time Polling
                                      v
+-----------------------------------------------------------------------------+
|                      MANAGED CLOUD DATABASE (SUPABASE)                      |
|                  AWS Region: ap-south-1 (Mumbai, IPv4 Pooler)               |
|                                                                             |
|  - PostgreSQL 16 managed database with Prisma ORM migrations               |
|  - Relational schema: Shops, Users, PrintJobs, Uploads, AuditLogs           |
|  - Atomic conditional locking for job claim operations                      |
+-----------------------------------------------------------------------------+
                                      ^
                                      | Database Queries (Session Pooler)
                                      v
+-----------------------------------------------------------------------------+
|                  SHOPKEEPER WINDOWS DESKTOP TERMINAL                        |
|                     Electron 31 + React 18 Counter App                      |
|                                                                             |
|  [Embedded Server Manager]                                                  |
|   - Auto-checks port 3001; spawns background NestJS API child process       |
|   - Connects to Supabase PostgreSQL database seamlessly                     |
|                                                                             |
|  [Counter Management Workspace]                                             |
|   - Real-time incoming job queue via Socket.IO /admin namespace             |
|   - Document preview viewer with live final price override input            |
|   - Ergonomic keyboard accelerators (A: Approve, R: Reject, Up/Down)        |
|   - Daily sales summary with one-click CSV report export                    |
|                                                                             |
|  [SumatraPDF Silent Print Worker]                                           |
|   - Claims approved jobs with row-level atomic locking                      |
|   - Automatic routing: B&W -> Monochrome Printer, Color -> Color Printer   |
|   - Silent execution via standalone SumatraPDF binary (No Windows dialogs)  |
+-----------------------------------------------------------------------------+
```

---

## 4. Complete Technology Stack Matrix

| Architectural Layer | Technology | Version | Rationale & Responsibility |
| :--- | :--- | :--- | :--- |
| Workspace Tooling | pnpm | 12.x / 9.x | Monorepo package linking, deterministic lockfiles, rapid parallel build caching. |
| Typing & Contracts | TypeScript | 5.7+ | Shared static typing across backend endpoints, database entities, and client interfaces. |
| Schema Validation | Zod | 3.24+ | Single source of truth for runtime validation in shared DTOs, API inputs, and web forms. |
| Customer Web Portal | Next.js (App Router) | 14.2+ | Mobile-first server-side rendering, instant page transitions, Tailwind CSS utility styling. |
| Administrative API | NestJS | 10.4+ | Structured dependency injection, modular controllers, Throttler rate limiting, WebSockets. |
| Database & ORM | PostgreSQL + Prisma | 16 / 5.22+ | Relational integrity, atomic row-level claim queries, type-safe database access client. |
| Real-Time Events | Socket.IO | 4.8+ | Low-latency duplex event transport for real-time counter queue synchronization. |
| Desktop Container | Electron | 31.7+ | Desktop integration, process isolation, background API spawning, Windows notifications. |
| Silent Spooling | SumatraPDF (pdf-to-printer) | 3.5+ | Portable, driver-agnostic silent printing bypassing Windows GUI print setup prompts. |
| Unit Test Runner | Vitest | 2.1+ | High-speed ESM unit test execution with zero-configuration TypeScript support. |
| Mobile E2E Runner | Playwright | 1.49+ | Mobile viewport Chromium automation verifying the end-to-end customer journey. |

---

## 5. Deep Component Breakdown

### 5.1 Shared Core Package (`packages/shared`)

The shared library contains pure, environment-agnostic business logic and typing rules consumed by both the web app, the backend API, and the desktop renderer:

- Zod Validation Contracts: Strict validation schemas enforcing legal values for job submissions, file upload limits, shop rate updates, and quote queries.
- Finite State Machine: State progression rules ensuring print jobs only transition through legal sequences: `PENDING_APPROVAL` -> `APPROVED` -> `PRINTING` -> `COMPLETED`, or terminal branches `REJECTED`, `FAILED`, and `CANCELLED`.
- Integer Paisa Pricing Mathematics: Avoids floating-point precision inaccuracies by executing all currency math in integer paisas (1 PKR = 100 paisas) before dividing for display.
- Lexical Page Range Parser: Expands and deduplicates complex human-entered page ranges (such as `1-3, 5, 8-10`) into validated arrays of page numbers while rejecting invalid ranges.
- Roman Urdu Internationalization Dictionary: Vernacular dictionary mapping standard English phrases to conversational Roman Urdu.

### 5.2 Customer Mobile Portal (`apps/web`)

The customer web portal is tuned specifically for 360px-420px mobile screens:

- Zero Account Barrier: Customers do not need to register, remember passwords, or confirm emails; sessions are anchored to public tokens.
- Interactive File Dropzone: Drag-and-drop and touch-to-browse file selector supporting PDF, DOCX, XLSX, PPTX, JPG, and PNG files up to 50 MB.
- Quick Stepper Controls: Quantity stepper controls complemented by one-tap quick preset chips (`1`, `2`, `3`, `5`, `10`).
- Visual Configuration Swatches: Visual toggle cards for Color Mode (Monochrome vs Vibrant Color) and Paper Sides (Single-sided vs Double-sided).
- Transparent Calculation Box: Dynamic breakdown displaying computed pages, copy quantities, unit rates, and final total in PKR.
- Floating Frosted-Glass Action Bar: Elevated bottom bar with backdrop blur ensuring price and submission controls are always reachable.
- High-Contrast Token Badge: Clear `#042` numeric token presentation with a one-click clipboard copy utility and visual confirmation.
- 4-Stage Progressive Timeline: Visual progress tracker displaying submission, shopkeeper approval, active printing, and collection readiness.
- Active Order Persistence: Saves the latest active token in browser `localStorage` to allow returning customers to check order status with a single tap.

### 5.3 Administrative Backend Service (`apps/api`)

The backend API handles authentication, business validation, file persistence, and worker management:

- Modular Architecture: Dedicated domain modules for `Auth`, `Shops`, `Uploads`, `Jobs`, `Quotes`, and `Cron`.
- Security & Rate Limiting: Protected by `@nestjs/throttler` to prevent denial-of-service attempts (Login capped at 5/min, Uploads at 10/hr per IP, Quote queries at 20/hr).
- 15-Minute Account Lockout: Automatically locks administrative accounts following 5 consecutive failed login attempts to stop brute-force attacks.
- Concurrency-Safe Atomic Claiming: Uses conditional SQL updates (`UPDATE "PrintJob" SET status = 'APPROVED' WHERE id = :id AND status = 'PENDING_APPROVAL'`) returning HTTP 409 Conflict if two counter terminals attempt to claim the same job simultaneously.
- Hourly Cleanup Cron: An automated background task runs every hour to remove stored document files older than configured retention limits (default: 24 hours) and marks stale uncollected orders as cancelled.

### 5.4 Counter Terminal Desktop Application (`apps/desktop`)

The desktop application provides counter operators with a fast, high-volume, zero-configuration workflow. In packaged production builds (`Chhapai Setup 1.0.0.exe`), the complete NestJS administrative backend API, Prisma client, and native Windows query engine DLL are embedded directly within the application's resources (`resources/api`):

- Zero-Click Embedded Background API Server: On application launch, the Electron main process checks if port 3001 is listening. If inactive, it automatically executes the embedded NestJS API using Electron's internal Node runtime (`process.execPath` with `ELECTRON_RUN_AS_NODE: 1`), connecting seamlessly to the cloud-managed Supabase PostgreSQL database. The shopkeeper never needs to install Node.js, configure environment variables, or run terminal commands.
- Persistent Real-Time Queue: Subscribes to the `/admin` Socket.IO namespace for instant updates without manual page refreshes.
- Audio & Visual Notification: Emits a custom Web Audio chime when a new job arrives, flashes the Windows taskbar, and triggers native Windows notifications when minimized.
- Document Preview Panel: Embeds a PDF preview viewer allowing operators to check document layout and formatting before printing.
- Live Price Override: Enables shopkeepers to adjust the final price on the fly for custom bindings, stapling, or discounts.
- Ergonomic Keyboard Accelerators: Operators can approve jobs using `A` or `Enter`, reject jobs using `R`, and cycle through queue items using `Arrow Up` and `Arrow Down`.
- Daily Sales Analytics: Calculates real-time daily metrics (Total Jobs, Pages Printed, Gross Revenue in PKR, Monochrome vs Color Split) with one-click CSV report export.
- Counter QR Poster Generator: Generates and prints custom SVG and PNG posters for the shop counter, including the shop name, phone number, and direct URL.
- Windows System Tray Integration: Minimizes cleanly to the Windows notification tray, maintaining queue monitoring and embedded API service in the background.

### 5.5 Hardware Silent Spooler Engine (`SumatraPDF`)

Physical output is handled by a deterministic background worker:

- Native Standalone Binaries: Integrates `pdf-to-printer`, bundling a self-contained SumatraPDF executable that sends jobs directly to the Windows print spooler without GUI dialogs.
- Smart Hardware Routing: Automatically routes monochrome jobs to the configured black-and-white printer and multi-color jobs to the color printer.
- Hardware Flag Translation: Correctly translates user options into physical print spooler arguments, including copy counts, simplex versus duplex (`duplexlong`), and page subsets.
- Startup Backlog Sync: Automatically queries the database on startup, claims any approved jobs that remained unprinted while the app was closed, and spools them in sequence.
- Error Interception: Catches operating system spooler failures (paper jams, spooler offline, out of toner), flags the job status as `FAILED`, and provides a one-click manual retry interface.

---

## 6. Zero-Cost Free Operational Model

Chhapai is designed to run entirely on free cloud tiers and local PC compute, eliminating monthly recurring server bills:

| Infrastructure Tier | Provider | Allocation | Operational Role |
| :--- | :--- | :--- | :--- |
| Customer Web Portal | Vercel Free Tier | Unlimited Edge Invocations | Serves mobile web app, renders upload forms, proxies public quote requests. |
| Cloud Database | Supabase Free Tier | 500 MB Postgres (ap-south-1) | Stores relational schema, shop configurations, pricing models, and job metadata. |
| API & Worker Compute | Local Shop PC | Host Windows Hardware | Runs embedded NestJS API, local file conversion, and silent SumatraPDF spooling. |

### Rationale: Avoiding Free Cloud Container Hibernation & Paid VPS Costs

Free container platforms (such as Render or Koyeb) hibernate after 15 minutes of inactivity. When a walk-in customer arrives to print, waking up a hibernating cloud container introduces a cold start delay of 40 to 50 seconds and terminates persistent WebSockets, creating unacceptable counter friction. Conversely, renting dedicated cloud VPS servers incurs unnecessary monthly costs for small retail print shops.

By embedding the complete NestJS backend API directly inside the standalone Windows desktop installer (`Chhapai Setup 1.0.0.exe`), the counter PC itself acts as the secure, zero-latency server host whenever the shop is open. Electron manages the backend API lifecycle silently in the background, connecting directly to the Supabase cloud PostgreSQL pooler over encrypted TLS. This provides instant response times, reliable local hardware printer access, and true zero-cost operations.

---

## 7. Monorepo Organization

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

## 8. Automated Testing Pyramid (70/70)

Chhapai maintains a comprehensive automated testing suite across every package in the monorepo:

```
================================================================================
LAYER                   SPECIFICATION FILE                  STATUS   TESTS
================================================================================
packages/shared         tests/schemas.test.ts               PASSED       5 tests
packages/shared         tests/pricing.test.ts               PASSED       6 tests
packages/shared         tests/page-range.test.ts            PASSED      11 tests
packages/shared         tests/state-machine.test.ts         PASSED       6 tests
--------------------------------------------------------------------------------
apps/api                test/auth.spec.ts                   PASSED       3 tests
apps/api                test/public.spec.ts                 PASSED       5 tests
apps/api                test/admin.spec.ts                  PASSED       8 tests
apps/api                test/conversion.spec.ts             PASSED       6 tests
apps/api                test/cron.spec.ts                   PASSED       3 tests
apps/api                test/token.spec.ts                  PASSED       2 tests
--------------------------------------------------------------------------------
apps/desktop            tests/desktop-state.test.ts         PASSED       4 tests
apps/desktop            tests/print-worker.test.ts          PASSED       6 tests
apps/desktop            tests/components.test.tsx           PASSED       4 tests
--------------------------------------------------------------------------------
apps/web                e2e/customer-flow.spec.ts           PASSED       1 test
================================================================================
TOTAL AUTOMATED TESTS PASSING:                                          70 / 70
================================================================================
```

### Running Test Commands

```bash
# Execute all unit and integration tests across monorepo
pnpm test

# Execute Playwright mobile viewport customer flow test
pnpm --filter @chhapai/web test:e2e
```

---

## 9. Setup & Development Guide

### 9.1 Prerequisites

- Node.js: Version 20.x or 24.x LTS.
- pnpm: Version 9.x or higher (`npm install -g pnpm`).
- Git: Version 2.40+ installed and configured.
- Operating System: Windows 10/11 is required to test native SumatraPDF hardware spooling. (Linux and macOS can run API and Web components).

### 9.2 Clone & Install

```bash
git clone https://github.com/abdulhayykhan/Chhapai.git
cd Chhapai
pnpm install
```

### 9.3 Environment Configuration

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

Ensure `apps/api/.env` is configured with a valid PostgreSQL connection:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chhapai_dev"
JWT_SECRET="development_jwt_secret_key_minimum_32_characters"
PORT=3001
CORS_ORIGIN="http://localhost:3000,http://localhost:5173"
FILE_UPLOAD_DIR="../../uploads"
```

### 9.4 Database Migrations & Seed Data

```bash
cd apps/api
pnpm prisma migrate deploy
pnpm prisma db seed
cd ../..
```

Default seeded credentials:
- Administrative URL: `http://localhost:3000/s/al-madina-photostat`
- Administrative Email: `admin@chhapai.com`
- Administrative Password: `Admin123!`

### 9.5 Starting Development Servers

```bash
# Terminal 1: Backend API
pnpm --filter @chhapai/api start:dev

# Terminal 2: Customer Mobile Web Portal
pnpm --filter @chhapai/web dev

# Terminal 3: Desktop Counter Application
pnpm --filter @chhapai/desktop dev
```

---

## 10. Packaging & Windows Release Workflow

The desktop application compiles into a standalone, all-in-one Windows installer (`.exe`) bundling the Electron runtime, pre-compiled UI assets, the complete NestJS backend API with Prisma query engine binaries, and unpacked SumatraPDF silent spooling executables.

### 10.1 All-in-One Embedded Packaging Workflow

Packaging is orchestrated by `scripts/bundle-api.mjs` before invoking `electron-builder`:

1. Production API Staging: Executes `pnpm --filter @chhapai/api --prod deploy` into `apps/desktop/resources/api`.
2. Native Engine Inclusion: Detects and copies the Windows Prisma native query engine (`query_engine-windows.dll.node`) and `@prisma/client` runtime from the root pnpm store.
3. Node Modules Protection: Renames `node_modules` to `api_modules` inside the staging folder so electron-builder default exclusion filters do not discard required backend dependencies.
4. Runtime Restoration: On startup, `serverManager.ts` automatically restores `api_modules` or injects `NODE_PATH`, spawning the API via Electron's internal Node runtime (`process.execPath` with `ELECTRON_RUN_AS_NODE: 1`).

### 10.2 Local Compilation

```bash
# Build shared contracts and backend API
pnpm --filter @chhapai/shared build
pnpm --filter @chhapai/api build

# Build UI and package the all-in-one standalone installer
pnpm --filter @chhapai/desktop package
```

The compiled 179 MB standalone installer is output to: `apps/desktop/release/Chhapai Setup 1.0.0.exe`.

### 10.3 Automated GitHub Actions Pipeline

Whenever a semantic version tag (such as `v1.0.0`) is pushed to the repository, `.github/workflows/release.yml` triggers an automated build:

1. Spins up a `windows-latest` runner.
2. Checks out the repository, initializes Node.js and pnpm.
3. Installs dependencies and compiles shared modules.
4. Executes the automated packaging workflow (`pnpm --filter @chhapai/desktop package`).
5. Uploads `Chhapai Setup 1.0.0.exe` directly to the tagged GitHub Release.

---

## 11. Architectural Decision Records (ADRs)

| ADR Number | Subject | Architectural Decision |
| :--- | :--- | :--- |
| ADR 001 | Language Standardization | Selected Roman Urdu (`ur-roman.json`) formatted Left-to-Right for optimal local comprehension. |
| ADR 002 | Monorepo Topology | Implemented pnpm workspaces to share Zod schemas, types, and build scripts across all packages. |
| ADR 003 | Pricing Calculations | All financial calculations run in integer paisas (1 PKR = 100 paisas) to prevent floating-point rounding bugs. |
| ADR 004 | Atomic Claim Protocol | Implemented conditional row-level database updates returning HTTP 409 Conflict to avoid double-printing. |
| ADR 005 | Outbound-Only Networking | Desktop client communicates using outbound HTTPS and WebSockets, working through restrictive CGNAT networks. |
| ADR 006 | SumatraPDF Engine | Integrated SumatraPDF via `pdf-to-printer` for silent, driver-independent Windows spooling. |
| ADR 007 | Headless Conversion Sandbox | Isolated file conversions inside an unprivileged LibreOffice sandbox with macros permanently disabled. |
| ADR 008 | 70-Test Quality Assurance | Maintained complete test coverage across shared schemas, API services, desktop components, and web flows. |
| ADR 009 | Embedded Zero-Cost Model | Replaced paid cloud containers with an Electron-managed local server connected to Supabase cloud database. |

---

## 12. Security & Data Protection

Chhapai implements security protections designed for retail walk-in environments:

1. Macro-Disabled Sandbox Execution: Customer documents (`.docx`, `.xlsx`, `.pptx`) are converted using LibreOffice in headless mode with all VBA macros disabled, neutralizing document-borne macro malware.
2. Automated File Retention Purging: Document files stored locally or on disk are automatically deleted by an hourly cleanup cron once jobs are marked completed or after 24 hours of inactivity.
3. Cryptographic Storage: Sensitive tokens, administrator passwords, and database connection strings are encrypted on disk using Electron's `safeStorage` API, which leverages Windows Data Protection API (DPAPI).
4. No Customer Data Retention: Anonymous walk-in customers do not have permanent database user records created; jobs are linked strictly to temporary anonymous tokens.

---

## 13. Author & Credits

Chhapai was conceived, architected, and built by [Abdul Hayy Khan](https://abdulhayykhan.dev).

- Developer: [Abdul Hayy Khan](https://abdulhayykhan.dev)
- Personal Portfolio: [abdulhayykhan.dev](https://abdulhayykhan.dev)
- GitHub Profile: https://github.com/abdulhayykhan
- Project Repository: https://github.com/abdulhayykhan/Chhapai

---

## 14. License

This software is released as an open-source project under the MIT License.  
Copyright 2026 [Abdul Hayy Khan](https://abdulhayykhan.dev). Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files, to deal in the Software without restriction.

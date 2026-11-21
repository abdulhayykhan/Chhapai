# Architecture & Design Decisions

This document records all architectural decisions, especially where requirements are clarified or adjusted from the original spec.

---

## Decision 001: Language Simplification to Roman Urdu

- **Date:** 2026-11-20
- **Context:** The original PRD specified dual English + Urdu script (`ur.json`) with RTL layout toggles and specialized Arabic typography (`Noto Naskh Arabic`).
- **Decision:** As requested by the project owner, user-facing text will be in **Roman Urdu** (`ur-roman.json`) with standard Left-to-Right (LTR) layout.
- **Rationale:**
  1. Roman Urdu is the primary medium for informal text communication in Pakistan (WhatsApp, SMS).
  2. Eliminates bidirectional (RTL) layout switching bugs and font-rendering quirks.
  3. Single-language interface simplifies the user journey (no language switcher required for walk-in mobile customers).
  4. Keeps technical loan words ("Print", "Tokens", "Copies", "Color", "Double-Sided") natural and unambiguous.
  5. Text remains organized in an i18n dictionary so additional languages can be introduced in future without code refactoring.

---

## Decision 002: Monorepo Structure & Package Management

- **Date:** 2026-11-20
- **Decision:** Use `pnpm` workspaces with TypeScript 5 strict mode.
- **Structure:**
  - `packages/shared`: Shared enums, types, Zod schemas, `calcQuote`, `parsePageRange`, and i18n keys.
  - `apps/api`: NestJS 10 + Prisma 5 + PostgreSQL backend.
  - `apps/web`: Next.js 14 App Router + Tailwind CSS customer portal.
  - `apps/desktop`: Electron + React (Vite) + `pdf-to-printer` counter app.

---

## Decision 003: Integer Paisa Math for Quotes and Pricing

- **Date:** 2026-11-20
- **Context:** Floating-point math (`0.1 + 0.2`) causes rounding discrepancies in invoices and reports.
- **Decision:** All price calculations in `packages/shared/pricing.ts` use integer paisa arithmetic (`Math.round(rate * 100)`), converting to whole rupees via `Math.ceil(printedPages * unitRatePaisa / 100)`.
- **Rationale:** Guarantees 100% deterministic quote calculation across API, Web, and Desktop apps.

---

## Decision 004: Atomic Row-Level Job Claiming

- **Date:** 2026-11-20
- **Context:** Multiple operator terminals or worker threads could attempt to print the same `APPROVED` job concurrently, causing duplicate prints and wasted paper.
- **Decision:** In `apps/api/src/admin/admin.service.ts`, `claimJob` uses an atomic row-level update with `WHERE id = :id AND status = 'APPROVED'`, returning HTTP 409 `INVALID_STATE_TRANSITION` if already claimed.
- **Rationale:** Prevents race conditions with zero external distributed locking dependencies.

---

## Decision 005: Outbound-Only Desktop Counter Architecture

- **Date:** 2026-11-20
- **Context:** Print shops in Pakistan typically use dynamic broadband IPs (PTCL, Nayatel, StormFiber) behind Carrier-Grade NAT (CGNAT), making inbound port forwarding impossible or fragile.
- **Decision:** The Electron counter application operates strictly via outbound HTTPS (`POST`/`GET`) and WebSocket (`/admin` namespace with reconnection backoff).
- **Rationale:** Works seamlessly behind any router, mobile hotspot, or firewall without requiring static IPs or port forwarding.

---

## Decision 006: SumatraPDF Silent Printing Engine Integration

- **Date:** 2026-11-21
- **Context:** Windows spooler APIs from Node.js can be brittle across diverse printer drivers.
- **Decision:** Use `pdf-to-printer` wrapping the lightweight, standalone SumatraPDF executable, with `asarUnpack: ["node_modules/pdf-to-printer/**"]` in electron-builder.
- **Rationale:** SumatraPDF reliably handles simplex/duplexlong, monochrome, page ranges, and silent spooling across HP, Canon, Epson, and virtual printers.

---

## Decision 007: Headless LibreOffice in Multi-Stage Docker

- **Date:** 2026-11-21
- **Context:** Customers upload `.docx`, `.xlsx`, `.pptx`, `.jpg`, and `.png` files that must be converted to standard A4 PDF for page counting and printing.
- **Decision:** In `docker/Dockerfile.api`, install Debian `libreoffice-writer`, `libreoffice-calc`, and `libreoffice-impress`, running under a non-privileged `chhapai` user with timeout and macro execution disabled.
- **Rationale:** Complies with PRD Section 12 security requirements while providing high-fidelity conversion.

---

## Decision 008: Comprehensive Quality Assurance & Verification Architecture

- **Date:** 2026-11-21
- **Context:** PRD Section 16 defines strict acceptance criteria and definition of done spanning unit, integration, mobile E2E, and operational workflows.
- **Decision:** Established a full QA pyramid with 70 automated tests:
  1. `packages/shared`: 28 unit tests covering Zod schemas, integer paisa arithmetic, page-range parsing, and state-machine transitions.
  2. `apps/api`: 27 integration tests verifying auth, 15-min lockout, rate limiting, atomic claiming race conditions, and retention cron.
  3. `apps/desktop`: 14 tests verifying queue categorization, sound chimes, price overrides, CSV exports, SumatraPDF worker options mapping, printer routing, and startup backlog sync.
  4. `apps/web`: Playwright mobile viewport E2E test executing the customer flow from QR scan landing to token generation and realtime status updates.
- **Rationale:** Ensures zero regressions across all components and validates 100% adherence to PRD Section 16 before release.

---

## Decision 009: Zero-Click Embedded Desktop Auto-Start & 100% Free Cloud Architecture

- **Date:** 2026-11-21
- **Context:** Free cloud hosting platforms (such as Render) enforce a 15-minute inactivity spin-down, causing 40-50 second cold starts and frequent WebSocket dropouts for walk-in print shop customers. Requiring a shopkeeper to manually run local servers or terminal commands every morning introduces friction and operational risk. Furthermore, small retail print shops in Pakistan operate on slim margins and cannot justify monthly VPS hosting fees.
- **Decision:** 
  1. **All-in-One Standalone Desktop Installer:** Packaging is orchestrated via `scripts/bundle-api.mjs` and `electron-builder`:
     - Uses `pnpm --filter @chhapai/api --prod deploy` to stage a clean production bundle of the NestJS API into `apps/desktop/resources/api`.
     - Detects and injects the native Windows Prisma query engine (`query_engine-windows.dll.node`) and `@prisma/client` runtime from the monorepo pnpm store into the staged bundle.
     - Temporarily renames `node_modules` to `api_modules` during packaging so `electron-builder` exclusion rules do not discard production dependencies.
     - Maps `extraResources: [{ "from": "resources/api", "to": "api" }]` into the final 179 MB `Chhapai Setup 1.0.0.exe` installer.
  2. **Zero-Prerequisite Runtime Execution:** In `apps/desktop/src/main/serverManager.ts`, when running in a packaged environment (`app.isPackaged`):
     - Restores `api_modules` or sets `NODE_PATH` pointing to the packaged dependencies.
     - Spawns the embedded API at `process.resourcesPath/api/dist/main.js` using Electron's internal Node runtime (`process.execPath` with `ELECTRON_RUN_AS_NODE: "1"`).
     - The shopkeeper's Windows 10/11 counter PC does **not** need Node.js, Git, or terminal access installed.
  3. **Cloud-Managed Supabase Database (`ap-south-1`):** The embedded API connects directly to Supabase cloud PostgreSQL using standard IPv4 connection pooling, ensuring customer uploads and order states persist reliably in the cloud.
  4. **Public Customer Portal on Vercel:** The mobile customer web app (`apps/web`) is deployed directly to Vercel (`https://chhapai-web.vercel.app`), delivering 24/7 global availability, edge speed, and zero cold starts at $0 cost.
  5. **Clean Process Lifecycle:** When the desktop app is minimized, it retreats to the Windows system tray while keeping the embedded API and print queue running. When the user exits the application, all spawned child processes terminate cleanly.
- **Rationale:** Delivers a 100% free, zero-maintenance, zero-config operational model for the shopkeeper—single installer, zero terminal windows, no monthly server bills, and instant responses for walk-in customers.

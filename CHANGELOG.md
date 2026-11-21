# Changelog

All notable changes to the Chhapai (چھپائی) project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Project created and maintained by [Abdul Hayy Khan](https://abdulhayykhan.dev).

---

## [1.0.0] - 2026-11-21

### Initial Stable Release

Chhapai is an open-source, self-service walk-in printing system purpose-built for retail print shops in Pakistan. This initial stable release provides an end-to-end workflow connecting walk-in mobile customers to shop counter printers without USB drives, Bluetooth pairing, or manual file handling.

### Added

#### Customer Web Portal (`apps/web`)
- Mobile-optimized walk-in customer portal deployed on Vercel (`https://chhapai-web.vercel.app`).
- Zero-friction QR scan entry point routing customers directly to shop-specific landing pages (`/s/:slug`).
- Multi-format file uploader supporting `.pdf`, `.docx`, `.xlsx`, `.pptx`, `.jpg`, and `.png` with client-side validation up to 50 MB.
- Real-time instant quote calculator powered by integer paisa arithmetic (`Math.ceil(printedPages * unitRatePaisa / 100)`).
- Urdu (Roman Urdu) interface tailored for local walk-in customers.
- 4-digit human-readable token generation with 1-click clipboard copy and live order status tracker (`/j/:token`).
- WhatsApp direct support link and automated order summary.

#### Desktop Counter Application (`apps/desktop`)
- Standalone Electron 31 Windows application with NSIS installer (`Chhapai Setup 1.0.0.exe`).
- Silent background printing engine integrating standalone SumatraPDF executable via `pdf-to-printer`.
- Realtime print queue dashboard categorized into Pending, In Progress, Printed, and Cancelled tabs.
- Auto-print toggle for hands-free processing of incoming approved print jobs.
- Printer routing configuration allowing separate default printers for Black & White (B/W) and Color documents.
- Audio chimes notifying operators when new customer jobs arrive at the counter.
- Manual price and page-range override capabilities for custom operator workflows.
- Daily reporting module with revenue metrics, page volume counters, and CSV export.
- Offline and startup backlog sync pulling pending jobs from server upon counter launch.
- Counter QR Code Poster generator with 1-click PNG/SVG download and direct A4 poster printing.

#### Backend REST API & Realtime Gateway (`apps/api`)
- NestJS 10 backend running with TypeScript strict mode.
- PostgreSQL persistence managed via Prisma ORM 5 with connection pooling.
- Dual JWT authentication architecture (15-minute access token, 7-day sliding refresh token in HTTP-only cookies).
- Brute-force security mitigation with exponential delays and automatic 15-minute account lockout after 5 consecutive failed attempts.
- WebSocket gateway (`/admin` namespace) broadcasting job events and status updates to counter apps.
- Atomic row-level job claiming preventing duplicate print attempts across concurrent operator terminals.
- Background cron worker executing automated retention cleanup of completed and failed print files after 24 hours.
- Headless LibreOffice and Sharp conversion pipeline converting uploaded Office documents and images into standardized A4 PDF files.

#### Shared Core Engine (`packages/shared`)
- Deterministic paisa arithmetic library eliminating floating-point rounding errors across quote generation and counter billing.
- Unified Zod schemas validating upload metadata, print options, page ranges, and authentication payloads.
- Finite state-machine transitions enforcing print job progression (`UPLOADED` -> `PENDING_REVIEW` -> `APPROVED` -> `PRINTING` -> `COMPLETED` / `FAILED` / `CANCELLED`).
- Standardized Roman Urdu i18n dictionary.

#### Testing & Quality Assurance
- Complete QA pyramid with 70 automated tests covering unit, integration, and E2E requirements.
- 28 unit tests in `packages/shared` validating paisa math, page-range parser, and Zod schemas.
- 27 integration tests in `apps/api` validating auth lockout, rate limits, atomic claiming, and file lifecycle.
- 14 automated tests in `apps/desktop` verifying queue filters, audio triggers, report aggregations, and printer settings.
- Mobile viewport Playwright E2E suite verifying customer flow from QR scan landing to token generation.

#### Deployment & Infrastructure
- Multi-container Docker Compose configuration with Caddy automatic TLS reverse proxy.
- Supabase cloud PostgreSQL database integration.
- Automated nightly PostgreSQL database backup script with 7-day rolling retention.
- GitHub Actions CI/CD workflow building and publishing Windows NSIS installers.

### Fixed
- Fixed default desktop API server URL from port 4000 to port 3001.
- Fixed database pooler connection configuration for cloud PostgreSQL instances.
- Resolved race conditions in multi-terminal print job claiming.

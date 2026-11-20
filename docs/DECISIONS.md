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

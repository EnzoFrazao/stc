# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start dev server (Vite)
npm run build        # Production build
npm run lint         # ESLint check
npm run test         # Run tests once (Vitest)
npm run test:watch   # Run tests in watch mode
```

The project uses `bun` as an alternative runtime (see `bun.lock`), but npm scripts work fine.

## Architecture Overview

**STC – Agiliza** is a React + TypeScript SPA for the Secretaria de Transparência do Maranhão. It manages data-collection requests sent from STC (admin) to government agencies (órgãos).

### Auth & Role System

`src/contexts/AuthContext.tsx` holds the entire auth layer. Auth is **mock-only** — credentials are hardcoded arrays in the file (no backend). Session persists via `sessionStorage`. Two roles drive UI branching throughout the app:

- `"admin"` — STC staff; sees `DashboardPage`, `SolicitacoesPage`, `RankingPage`
- `"orgao"` — government agency; sees `OrgaoDashboardPage`, directed to `ChatbotPage` per request

`ProtectedRoute` redirects unauthenticated users to `/login`.

### Data Layer

All domain data lives in **`src/data/mockData.ts`** — a single file containing both TypeScript type definitions and in-memory mock data arrays. There is no API or backend. Key entities:

- `ObjetoTransparencia` — template describing what data is being requested (fields, format, instructions)
- `Solicitacao` — a data request sent to one or more órgãos
- `RespostaOrgao` + `RespostaItem` — an agency's response, field by field
- `ChatConversation` / `ChatMessage` — chatbot conversation state per solicitacao/orgao pair

`calcularStatusSolicitacao()` and `calcProgresso()` are pure functions used across multiple pages to derive status from responses.

### Routing

Defined in `src/App.tsx`. All authenticated routes are wrapped in `<ProtectedRoute>`. The chatbot route accepts an optional `solicitacaoId` param (`/chatbot/:solicitacaoId`).

### Page Structure

Each page is a self-contained file in `src/pages/`. Pages manage their own local state (no global state manager). Pages use `mockData` directly — mutations are local `useState` updates that reset on refresh.

Role-based redirect at login: admins go to `/dashboard`, órgãos go to `/orgao-dashboard`.

### Component Layers

- `src/components/ui/` — shadcn/ui primitives (don't edit; regenerate via shadcn CLI)
- `src/components/layout/` — `PageShell`, `PageHeader`, `SectionHeading`, `SurfaceCard` — structural wrappers
- `src/components/feedback/` — `StatCard`, `MetricTile`, `StatusPill`, `EmptyState` — display-only atoms
- `src/components/chatbot/` — `ComplianceSidebar`, `FileSourceModal` — chatbot-specific components
- `src/components/AppHeader.tsx` — sticky header with logo, title, user avatar, logout; accepts `variant` prop (`"gradient"` | `"solid"` | `"minimal"`) and optional `rightSlot`

### Styling System

Tailwind + CSS custom properties in `src/index.css`. The design token system includes:

- `brand-{50..900}` — deep navy blue (STC brand identity)
- `status-{enviada,aberta,parcial,nao_enviada,fechada}` + `-bg` variants — semantic colors for request statuses
- `surface`, `canvas`, `surface-raised`, `surface-sunken` — layered surface hierarchy
- `gradient-brand`, `gradient-hero`, `gradient-canvas` — named gradients
- `shadow-soft`, `shadow-card`, `shadow-pop` — named shadow scale
- `font-display` — Inter Tight for headings; `font-sans` — Inter for body

Always use these tokens rather than raw colors.

### Chatbot Flow

`ChatbotPage` is the most complex page. It handles:
1. File upload → simulated OCR extraction → review modal → confirm to state
2. Manual form fill → submit to state
3. Item-level vs. batch upload (tracked via `uploadTargetItem` state)

The `ComplianceSidebar` shows checklist progress per `RespostaOrgao`. The `FileSourceModal` is a picker for camera/gallery/file/document.

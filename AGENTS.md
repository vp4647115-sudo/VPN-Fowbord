# AGENTS.md — FlowBoard.ai Enterprise Agent Directives

> **Project Identity**: FlowBoard.ai — Enterprise Systems Architecture, Algorithm Design & AI Diagram Whiteboard Platform
> **Domain**: System Architecture, BPMN Workflows, Algorithm Design, Full-Stack SaaS

---

## 🏛️ 1. ARCHITECTURE & CODE CONVENTIONS

### 1.1 Clean Code & SOLID Principles
- **TypeScript Strict Mode**: Never use `any`. Define explicit discriminated unions and domain interfaces in `src/types.ts`.
- **Early Returns & Guard Clauses**: Validate inputs immediately (email formats, password lengths, token claims) and return fast before processing main logic.
- **Component Geometry**: Keep components single-purpose and under 250 lines. Extract UI sub-components into `src/components/ui/` or domain feature modules.
- **Zero Console Errors**: Always wrap external API calls (Firebase, Supabase, Gemini) in `try...catch` blocks with user-facing alert state.

---

## 🔐 2. AUTHENTICATION & SECURITY STANDARDS

### 2.1 Multi-Tier Auth Pipeline
- **Primary Auth Engine**: Supabase Authentication with email verification and password validation (minimum 6 characters, RFC-compliant email regex).
- **Secondary Auth Engine**: Firebase Auth (`auth`, `loginWithGoogle`, `signInAnonymously`).
- **OAuth & Google Login**: Provide Google OAuth login with graceful fallback for iframe sandboxes.
- **Verification Flow**: Require 6-digit verification code step (`verifyEmailCode`) before granting full account access.

---

## 🎨 3. UI / UX & DESIGN SYSTEM

### 3.1 Visual Tokens & Theme
- **Dark Luxury Aesthetic**: Deep slate canvas (`#0a0a0c`, `#121215`), subtle glassmorphism cards (`bg-white/10 backdrop-blur-xl border-white/10`), high contrast white text, and vivid electric blue accents (`#3b82f6` / `bg-blue-600`).
- **Brand Typography**: Bold uppercase tracking for headers (`FLOWBOARD` — `FLOW` in blue, `BOARD` in white/dark slate), subtitle `PLAN. ALGORITHM. BUILD.`.
- **Accessibility**: WCAG 2.1 AA contrast compliance, minimum 44px touch targets on interactive buttons, and visible focus rings.

### 3.2 AI Diagram Theme & Node High-Contrast Guidelines
- **High-Contrast Card Fills**: All AI generated nodes MUST use distinct, vibrant, high-contrast card background fills (`#ffffff` for clean cards, `#e0f2fe` for primary services/gateways, `#dcfce7` for databases, `#fef3c7` for credentials/notes, `#f3e8ff` for milestones/triggers) with clear stroke borders (`#004ac6`, `#0284c7`, `#15803d`, `#d97706`).
- **Strict Black Fill Prohibition**: NEVER output pure black (`#000000`) or dark canvas fills (`#0a0a0c`, `#121215`) for node card backgrounds or text. Node content MUST be 100% legible against both light and dark whiteboard canvas.
- **Dynamic Text Contrast**: Ensure node title and subtitle text colors automatically adjust to match their node background (dark text on light cards, white text on dark primary cards).

---

## ⚡ 4. AI DIAGRAM & BACKEND ENGINE

### 4.1 Server & AI Architecture
- **Server**: Express 5 on Node.js 22 LTS listening on `0.0.0.0:3000`.
- **AI Integration**: Lazy-initialize `@google/genai` with `process.env.GEMINI_API_KEY`. Never expose API keys to client bundles.
- **Theme-Aware AI Diagram Prompts**: AI diagram synthesis MUST listen to theme directives, outputting vibrant light/accent card fills with crisp borders and 100% readable text labels.
- **Resilience**: Implement rate limiting, request timeout guards, and graceful SIGTERM shutdown handlers.

---

## 📋 5. QUALITY GATES & VERIFICATION

Before completing any development task:
1. Run `lint_applet` (`tsc --noEmit`) to verify zero TypeScript or syntax errors.
2. Run `compile_applet` to verify production Vite + ESBuild server compilation succeeds.
3. Test dev server behavior with `restart_dev_server` if backend routes or scripts change.

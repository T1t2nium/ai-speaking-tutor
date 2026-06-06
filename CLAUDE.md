# AI English Speaking Tutor — Project Guidance

## Project Overview

An AI-powered English speaking tutor web application. Users practice spoken English through real-time voice conversations with an AI tutor across multiple scenarios. The system provides pronunciation evaluation, grammar correction, and progress tracking.

**Tech stack:** Next.js 14 (frontend), Fastify/Node.js (backend), TypeScript throughout, WebSocket for real-time audio, Deepgram STT, DeepSeek LLM, ElevenLabs TTS, Speechace pronunciation, Supabase PostgreSQL + Auth.

**Status:** Phase 1 & 2 complete. Moving to Phase 3 — Full Voice Conversation Loop (TTS integration).

## Documentation Map

All project specifications are in `docs/`. Read them before making significant changes:

| File | Purpose | When to Read |
|---|---|---|
| `docs/01-requirements.md` | Product requirements, user stories, functional/non-functional specs | Before adding features |
| `docs/02-tech-spec.md` | Architecture, tech decisions, data flow, latency budget | Before architectural changes |
| `docs/03-design-system.md` | Design principles, color palette, component patterns, layout | Before UI work |
| `docs/04-implementation.md` | Phased implementation plan with tasks and verification criteria | Before starting each phase |
| `docs/05-api-protocol.md` | REST API endpoints + WebSocket message protocol | Before API/WS changes |

## Development Journal

| File | Purpose |
|---|---|
| `dev-logs/TODO.md` | Current task list and backlog for all phases |
| `dev-logs/CHANGELOG.md` | Chronological record of completed work |

**Always update these files** when completing tasks or adding new items. Mark TODO items as `[x]` when done, and add dated entries to CHANGELOG.

## Development Workflow

### Running the project
```bash
npm install                    # Install all workspace dependencies
npm run dev:server            # Terminal 1: Backend on localhost:3001
npm run dev:frontend          # Terminal 2: Frontend on localhost:3000
```

### Key commands
- `npm run dev` — Start all workspaces
- `npm run build` — Build all workspaces
- `npm test` — Run tests across workspaces

### Environment
Copy `.env.example` to `.env` and fill in API keys before running the server. All external API calls require valid keys.

## Architectural Conventions

### Monorepo Structure
- `frontend/` — Next.js 14 App Router, React 18, Tailwind, Zustand
- `server/` — Fastify with WebSocket support, REST API
- `shared/` — TypeScript types and scenario definitions used by both

### Shared Types
All shared TypeScript interfaces live in `shared/types.ts`. Both frontend and server import from `@tutor/shared`. **Never duplicate type definitions.** If you need a new type that crosses the frontend/backend boundary, add it to `shared/types.ts`.

### WebSocket Protocol
Audio flows as binary frames (Opus in Ogg container). Text messages are JSON following `WsClientMessage` / `WsServerMessage` types in `shared/types.ts`. See `docs/05-api-protocol.md` for the full specification.

### State Management
- Frontend uses Zustand for client state (conversation store, user store)
- Server keeps per-session conversation state in memory during active sessions
- No Redux, no React Context for global state — Zustand is the standard

### Audio Pipeline
The core data flow is: `Browser Mic → Opus Encoder → WebSocket → Server → Deepgram STT → Claude LLM → ElevenLabs TTS → WebSocket → Browser AudioContext`. The orchestrator lives in `server/src/websocket/audioPipeline.ts`.

### External API Calls
All external API calls (Deepgram, Claude, ElevenLabs, Speechace) go through the server. **Never call external APIs from the browser.** API keys are server-side only.

## Coding Standards

Follow `.claude/rules/rule1.md` for general behavioral guidelines:
1. Think before coding — state assumptions, surface tradeoffs
2. Simplicity first — minimum code, no speculative features
3. Surgical changes — touch only what's needed
4. Goal-driven execution — define verifiable success criteria

### Additional project-specific rules:
- **TypeScript strict mode** is enabled in both frontend and server. No `any` types without explicit justification.
- **Don't add new dependencies** without checking if existing ones can do the job.
- **Match existing patterns.** Look at surrounding code before writing new code.
- **shared/types.ts is the source of truth** for data structures crossing the boundary.
- **Each phase must be independently testable.** Don't build Phase 3 scaffolding during Phase 1.

## Phased Approach

Work through phases sequentially. Each phase has a clear testable outcome defined in `docs/04-implementation.md`. Don't jump ahead — completing the current phase before starting the next ensures stable, incremental progress.

Current phase: **Phase 1 — Project Scaffolding & Audio Foundation**

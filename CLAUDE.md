# AI English Speaking Tutor — Project Guidance

## Project Overview

An AI-powered English speaking tutor web application. Users practice spoken English through real-time voice conversations with an AI tutor across multiple scenarios. The system provides pronunciation evaluation, grammar correction, and progress tracking.

**Tech stack:** Next.js 14 (frontend), Fastify/Node.js (backend), TypeScript throughout, WebSocket for real-time audio, Deepgram STT, DeepSeek LLM, ElevenLabs TTS, Speechace pronunciation, Supabase PostgreSQL + Auth.

**Status:** Phase 1, 2, 3 complete. Moving to Phase 4 — VAD & Natural Turn-Taking.

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
The core data flow is: `Browser Mic → Opus Encoder → WebSocket → Server → Deepgram STT → DeepSeek LLM → ElevenLabs TTS → WebSocket → Browser AudioContext`. The orchestrator lives in `server/src/websocket/handler.ts`.

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

Current phase: **Phase 3 — Full Voice Conversation Loop** (complete). Next: **Phase 4 — VAD & Natural Turn-Taking**

## 代码审查规则规范 (Code Contribution & PR Rules)

### 1. 有效性与提交流程 (Project Validity & Delivery)
- **持续交付要求**：
  - 开发周期内必须保持全周期、持续的 Pull Request (PR) 和 commit 记录。
  - **[致命违规]** 严禁“突击提交”。若一次性导入所有代码，将被直接判定为**无效**。
- **时间戳合规**：所有 commit 的时间戳必须严格落在所属批次的**开始与截止时间**范围内。
- **无效 PR 判定标准**（出现以下情况视为无效）：
  - PR 描述为空白。
  - PR 描述与实际代码变更严重不符。
- **依赖与引用声明**：
  - **第三方引用**：若引入第三方库或框架，必须在 `README` 中明确列出依赖项，并清晰界定哪些部分属于原创功能。
  - **代码复用**：若复用本人过往的代码片段，必须在 PR 描述中明确注明代码来源。

---

### 2. PR (Pull Request) 提交规范 (PR Standards)
- **分支管理**：所有新功能的开发必须基于 PR 进行提交，严禁直接推送到主分支。
- **单一职责原则 (Single Responsibility)**：
  - **一个 PR = 一件事**：每个 PR 仅限实现或修改单一功能。
  - **细粒度原则**：PR 的修改粒度应尽可能小。
  - **功能拆分**：遇到大型功能时，必须将其拆分为多个独立的 PR，分步骤进行提交。
- **PR 信息模板**（提交 PR 时必须包含以下完整结构）：
  - **标题 (Title)**：用一句话简明扼要地说明本 PR 新增或修改的内容。
  - **功能描述 (Description)**：详细说明该功能的作用以及使用方式。
  - **实现思路 (Implementation)**：简要阐述所采用的技术选型或核心实现逻辑。
  - **测试方式 (Testing)**：提供具体的测试步骤，说明如何验证该功能正常运行。
- **主分支稳定性约束**：
  - PR 合并后，主分支 (Main/Master) 的代码必须始终保持**随时可运行**的状态。
  - 确保代码演示效果在任意时间拉取时均能被成功复现。

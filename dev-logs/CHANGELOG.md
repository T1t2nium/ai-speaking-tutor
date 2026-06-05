# Changelog

## 2026-06-05 — Project Initialization

### Created
- Project directory structure (frontend/, server/, shared/, docs/, dev-logs/, scripts/)
- Root package.json with npm workspaces configuration
- `shared/` package with TypeScript types and scenario definitions
- `frontend/` package.json with Next.js 14, React 18, Tailwind, Zustand
- `server/` package.json with Fastify, WebSocket, Anthropic SDK
- `.gitignore` for Node.js/Next.js project
- `.env.example` with all required API keys
- `docs/` with 5 specification documents:
  - `01-requirements.md` — Product requirements and user stories
  - `02-tech-spec.md` — Technical specification and architecture
  - `03-design-system.md` — UI/UX design guidelines
  - `04-implementation.md` — Phased implementation plan
  - `05-api-protocol.md` — REST API and WebSocket protocol specs
- `dev-logs/TODO.md` — Task tracking for all phases
- `dev-logs/CHANGELOG.md` — This file
- `CLAUDE.md` — AI assistant guidance
- `README.md` — Project overview and setup instructions
- Git repository initialized

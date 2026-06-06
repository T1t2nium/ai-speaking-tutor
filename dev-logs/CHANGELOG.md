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

## 2026-06-05 — Audio Pipeline Implementation

### Created
- `server/src/services/stt.ts` — Deepgram streaming STT via WebSocket (Nova-2, Opus, interim results)
- `frontend/src/lib/audio.ts` — Microphone capture with MediaRecorder Opus encoding, Blob→ArrayBuffer util
- `frontend/src/lib/constants.ts` — WS_BASE_URL and API_BASE_URL config
- `frontend/src/hooks/useAudioRecorder.ts` — Mic capture hook with permission error handling
- `frontend/src/hooks/useAudioPlayback.ts` — Streaming AudioContext playback with gapless queue
- `frontend/src/hooks/useWebSocket.ts` — WebSocket lifecycle with binary frames and auto-reconnect
- `frontend/src/hooks/useConversation.ts` — Master orchestrator connecting mic → WS → server → transcript
- `frontend/src/store/conversationStore.ts` — Zustand store for conversation state, messages, phase

### Modified
- `server/src/websocket/handler.ts` — Integrated Deepgram STT, routes audio chunks and control messages
- `frontend/src/app/session/[id]/page.tsx` — Connected to useConversation hook, live transcript display
- `server/tsconfig.json` — Fixed rootDir to include shared types
- `server/package.json` — Added @deepgram/sdk dependency

### Verified
- Server starts and compiles clean (TypeScript strict)
- Frontend builds successfully
- WebSocket connection lifecycle works
- Deepgram STT service connects (tests pending browser verification)

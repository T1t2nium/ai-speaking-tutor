# Changelog

## 2026-06-06 — Phase 2: DeepSeek AI Conversation

### Created
- `server/src/services/llm.ts` — DeepSeek streaming chat (OpenAI-compatible API, 30s timeout)

### Modified
- `server/src/websocket/handler.ts` — Full conversation pipeline:
  - Scenario system prompt injection
  - Per-session conversation history (system + user + assistant)
  - isBinary routing to distinguish audio frames from JSON control messages
  - STT lazy creation with audio buffering (no lost chunks)
  - Per-turn STT rebuild for multi-turn support
  - Direct LLM trigger on audio_end (no callback chain)
- `server/src/services/stt.ts` — Audio buffering, exported STTStream interface
- `server/src/config.ts` — Added deepseek config, dotenv path fix
- `shared/types.ts` — Updated connected message shape
- `frontend/src/store/conversationStore.ts` — AI message handling, phase fixes
- `frontend/src/hooks/useWebSocket.ts` — Ghost connection prevention, cleanup fixes
- `.env` — DeepSeek API key added

### Key Bug Fixes
- WS double-connection from React Strict Mode (always close on cleanup)
- isBinary routing: text JSON messages were sent to Deepgram as audio
- STT idle timeout preventing multi-turn (on-demand creation)
- Phase stuck in Processing after auto-finalization (manual stop only)

### Verified
- Full flow: mic → STT → DeepSeek → AI response displayed in browser
- Multi-turn conversation works across multiple speak/stop cycles
- Server and frontend builds pass

---

## 2026-06-05 — Phase 1: Audio Pipeline & Project Scaffolding

### Created
- Project directory structure, npm workspaces, git repo
- `docs/` with 5 specification documents
- `dev-logs/` with TODO.md and CHANGELOG.md
- `CLAUDE.md`, `README.md`, `.env.example`, `.gitignore`
- `shared/` — TypeScript types and 4 scenario definitions
- `frontend/` — Next.js 14, Tailwind, landing page, session page, Zustand store
- `server/` — Fastify + WebSocket + Deepgram STT service
- Audio hooks: useAudioRecorder, useAudioPlayback, useWebSocket, useConversation
- `server/src/services/stt.ts` — Deepgram streaming STT (Nova-2, linear16, 16kHz)
- `frontend/src/lib/audio.ts` — PCM audio capture with ScriptProcessorNode
- `.env` — API keys for Deepgram and DeepSeek

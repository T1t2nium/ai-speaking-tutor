# Changelog

## 2026-06-07 — Phase 6: Persistence & Authentication

### Created
- `server/src/db/schema.ts` — Drizzle ORM schema (users, sessions, messages, evaluations tables)
- `server/src/db/connection.ts` — PostgreSQL pool + Drizzle client
- `server/drizzle.config.ts` — Drizzle Kit configuration
- `server/src/services/auth.ts` — Password hashing (bcrypt), JWT sign/verify, register/login
- `server/src/middleware/auth.ts` — Fastify preHandler JWT auth middleware
- `server/src/services/sessionStore.ts` — Session/message/evaluation CRUD, user progress queries
- `frontend/src/store/authStore.ts` — Zustand auth store (login/register/logout/checkAuth)
- `frontend/src/app/login/page.tsx` — Login page
- `frontend/src/app/register/page.tsx` — Registration page
- `frontend/src/app/AuthNav.tsx` — Auth-aware navigation component
- `frontend/src/app/dashboard/page.tsx` — Dashboard (stats, recent sessions, scenarios practiced)
- `frontend/src/app/dashboard/[id]/page.tsx` — Session detail (transcript + evaluation replay)

### Modified
- `server/package.json` — Added drizzle-orm, pg, jsonwebtoken, bcryptjs, drizzle-kit
- `server/src/config.ts` — Added databaseUrl, jwtSecret
- `server/src/app.ts` — Auth routes (register/login/me), session CRUD routes, user progress route
- `server/src/websocket/handler.ts` — JWT auth on connect, DB-backed scenario lookup, fire-and-forget message/evaluation persistence
- `frontend/package.json` — No new deps (all auth via built-in fetch)
- `frontend/src/app/layout.tsx` — AuthNav replacing static nav
- `frontend/src/app/page.tsx` — Auth gate, POST /api/sessions to create session before redirect
- `frontend/src/app/session/[id]/page.tsx` — Auth redirect, REST-loaded scenario, UUID-based routing
- `frontend/src/hooks/useWebSocket.ts` — Token in WS URL query parameter
- `frontend/src/store/conversationStore.ts` — Store scenario from connected message
- `.env.example` — Added DATABASE_URL, JWT_SECRET

### Key Features
- Custom JWT authentication (register, login, token verification, 7d expiry)
- PostgreSQL persistence via Drizzle ORM (users, sessions, messages, evaluations)
- Auth-first flow: login/register required before starting a scenario
- Session created via REST API, then voice conversation via WebSocket
- Messages persisted fire-and-forget during conversation
- Evaluation persisted at session end
- Dashboard with session history, stats, and progress data
- Session detail page with full transcript and evaluation replay
- Auth-aware navigation (login/register links or user menu)

### Verified
- `npm run build` passes (server + frontend)
- Server TypeScript compiles with strict mode
- Frontend TypeScript compiles with strict mode

---

## 2026-06-07 — Phase 5: Corrections & Evaluation

### Created
- `server/src/services/pronunciation.ts` — Speechace API integration, PCM→WAV conversion, phoneme-level error parsing
- `server/src/services/evaluation.ts` — Per-turn grammar analysis via DeepSeek, post-session evaluation generation
- `frontend/src/app/session/[id]/EvaluationPanel.tsx` — Score gauges, error lists, vocabulary, recommendations

### Modified
- `shared/types.ts` — Added `evaluation_result` WS message type, `messageIndex` in correction message
- `server/src/websocket/handler.ts` — Audio buffering per turn, fire-and-forget grammar analysis, end-session evaluation pipeline
- `frontend/src/store/conversationStore.ts` — Added evaluation/correctionMap state, handle correction and evaluation_result messages
- `frontend/src/app/session/[id]/page.tsx` — Inline correction annotations in user message bubbles, evaluation panel integration
- `frontend/src/hooks/useConversation.ts` — Simplified to single tap-to-toggle (removed VAD auto + long-press PTT)
- `frontend/src/hooks/useAudioRecorder.ts` — Mic stream reuse across turns (create once, pause/resume)
- `frontend/src/lib/audio.ts` — Separated `stop()` (pause+flush) from `close()` (teardown)
- `shared/scenarios.ts` — Updated system prompts to include grammar correction instructions

### Key Features
- Per-turn grammar corrections displayed inline below user messages (strikethrough + corrected + expandable explanation)
- Fire-and-forget grammar analysis runs in parallel with AI response (no latency impact)
- Pronunciation evaluation at session end via Speechace (phoneme-level, PCM→WAV conversion)
- Post-session evaluation panel with SVG score gauges, error lists, vocabulary, and AI-generated recommendations
- Graceful degradation: all external API failures return empty/safe defaults
- Simplified interaction: single tap-to-toggle recording (no VAD or push-to-talk complexity)

### Verified
- `npm run build` passes
- Multi-turn grammar correction delivery
- End-session evaluation pipeline produces scores, summary, and recommendations

---

## 2026-06-07 — Phase 4: VAD & Natural Turn-Taking

### Created
- `frontend/src/hooks/useVAD.ts` — RMS energy-based VAD with hysteresis, zero dependencies

### Modified
- `frontend/src/hooks/useConversation.ts` — Dual input modes:
  - Long-press: push-to-talk (hold to record, release → AI)
  - Single-tap: VAD auto mode (auto-detect speech end)
  - Continuous mic, audio gated by phase, VAD guarded by vadEnabled flag
  - Browser TTS onend transitions back to listening
- `frontend/src/app/session/[id]/page.tsx` — Long-press/tap detection (300ms threshold)
  - Silence progress bar, phase-dependent labels
- `frontend/src/store/conversationStore.ts` — Consecutive user messages merged into one bubble
- `server/src/websocket/handler.ts` — Interrupt handling with AbortController
  - STT lifecycle fix: null after finalize to allow fresh STT on next audio
  - Transcript merging: all pending transcripts joined into one user message at audio_end
  - Empty audio_end sends ai_response_end (no hang)
- `server/src/services/llm.ts` — Switched to deepseek-v4-flash, 5 retries with exponential backoff
  - Connection: close header for fresh TCP per request
- `server/src/services/tts.ts` — Optional AbortSignal for interruption, 402 logged as WARN

### Key Features
- Auto speech detection with 1200ms silence threshold (forgiving for learners)
- Silence progress indicator in UI
- Push-to-talk mode for precise control
- VAD auto mode for natural conversation
- Transcript fragmentation merged into coherent messages
- LLM failure auto-recovery (resumes listening)

### Verified
- Natural multi-turn voice conversation
- Long-press PTT and single-tap VAD both working
- Interrupt message wiring in place (server-side AbortController)

---

## 2026-06-06 — Phase 3 Fixes: LLM Retry + STT Finalize Race + TTS Fallback

### Modified
- `server/src/services/llm.ts` — Retry on socket errors (3 attempts, 1s/2s/4s backoff)
- `server/src/services/stt.ts` — `finalize()` returns Promise, resolves on final transcript or 5s timeout
- `server/src/websocket/handler.ts` — `await stt.finalize()` before `generateResponse()` to fix transcript race
- `server/src/services/tts.ts` — 402 downgraded to WARN (free tier is expected)
- `frontend/src/hooks/useConversation.ts` — Browser speechSynthesis fallback when TTS fails

### Key Bug Fixes
- STT finalize race condition: `generateResponse()` sometimes ran before final transcript arrived
- DeepSeek `UND_ERR_SOCKET` intermittent failures now auto-retry
- Noisy ElevenLabs 402 ERROR → WARN (browser TTS handles it gracefully)

### Verified
- Transcripts appear consistently on every turn
- DeepSeek retries recover from intermittent socket failures
- Browser TTS fallback works when ElevenLabs is unavailable

---

## 2026-06-06 — Phase 3: Full Voice Conversation Loop

### Created
- `server/src/services/tts.ts` — ElevenLabs streaming TTS (REST API, MP3 output, 30s timeout)

### Modified
- `server/src/websocket/handler.ts` — Full voice pipeline:
  - TTS called after LLM generates response
  - `ai_response_start` sent before TTS (text appears immediately)
  - TTS MP3 chunks streamed as binary WS frames
  - `ai_response_end` sent after TTS completes
  - TTS errors caught gracefully (client doesn't hang)
  - Voice determined from scenario.voiceId or config default
- `server/src/config.ts` — Added `elevenlabs.voiceId` (default: Rachel)
- `frontend/src/hooks/useWebSocket.ts` — Added `onBinaryMessage` callback for incoming binary frames
- `frontend/src/hooks/useConversation.ts` — Accumulates TTS audio chunks, concatenates on `ai_response_end`, plays via AudioContext
- `.env.example` — Added ELEVENLABS_VOICE_ID and DEEPSEEK_API_KEY

### Verified
- Full voice loop: speak → transcript → AI text bubble → AI voice response through speakers
- Multi-turn voice conversation works
- Server and frontend builds pass

---

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

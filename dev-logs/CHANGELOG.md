# Changelog

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

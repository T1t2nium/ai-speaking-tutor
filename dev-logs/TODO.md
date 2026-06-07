# TODO — AI Speaking Tutor

## Completed

### Phase 1: Project Scaffolding & Audio Foundation ✅
- [x] Initialize git repo, npm workspaces, install dependencies
- [x] Create docs/, dev-logs/, CLAUDE.md, README
- [x] Frontend: Next.js 14 + Tailwind, landing page with scenario grid
- [x] Server: Fastify + WebSocket entry point
- [x] useAudioRecorder hook (Int16 PCM capture, 16kHz)
- [x] useAudioPlayback hook (AudioContext streaming)
- [x] useWebSocket hook (binary frames, reconnect)
- [x] useConversation hook (orchestrator)
- [x] conversationStore (Zustand)
- [x] Deepgram STT integration (linear16, Nova-2)
- [x] End-to-end: mic → WS → Deepgram → transcript verified

### Phase 2: Text-Only AI Conversation ✅
- [x] DeepSeek API service with streaming responses
- [x] Scenario system prompt injection into conversation history
- [x] Per-session conversation history (system + user + assistant)
- [x] Multi-turn conversation support (STT rebuild per turn)
- [x] AI response in conversation bubbles
- [x] isBinary routing fix (audio vs control messages)
- [x] STT lazy creation + audio buffering
- [x] End-to-end verified: speak → transcript → AI response

### Phase 3: Full Voice Conversation Loop ✅
- [x] ElevenLabs TTS integration (streaming REST API, MP3 output)
- [x] Audio pipeline: STT → LLM → TTS → playback
- [x] Binary audio frames client → accumulate → decode → play
- [x] Browser speechSynthesis TTS fallback
- [x] End-to-end voice-in voice-out conversation

### Phase 4: VAD & Natural Turn-Taking ✅
- [x] RMS energy-based VAD (zero-dependency, hysteresis thresholds)
- [x] Auto speech-end detection (1200ms silence, forgiving for learners)
- [x] Silence progress indicator in UI
- [x] Dual input modes: long-press (push-to-talk) + single-tap (VAD auto)
- [x] Interruption support (server AbortController, client interrupt message)
- [x] Continuous mic mode (no per-turn create/destroy)
- [x] Transcript merging (fragmented speech → one message)
- [x] LLM failure recovery (auto-resume listening)
- [x] DeepSeek v4-flash model + retry logic (5 attempts, exponential backoff)

### Phase 5: Corrections & Evaluation ✅
- [x] Speechace pronunciation API integration (PCM→WAV, phoneme scoring)
- [x] Grammar/expression correction via DeepSeek (fire-and-forget per turn)
- [x] Audio buffering per turn for pronunciation evaluation
- [x] Post-session evaluation pipeline (pronunciation + grammar + DeepSeek scores)
- [x] Inline correction UI (strikethrough/corrected, expandable explanation)
- [x] Evaluation panel UI (score gauges, error lists, vocabulary, recommendations)
- [x] Shared types: evaluation_result message, correction messageIndex

### Phase 6: Persistence & Authentication ✅
- [x] PostgreSQL database + Drizzle ORM schema (users, sessions, messages, evaluations)
- [x] Custom JWT authentication (register, login, token verify)
- [x] Auth pages (login, register) + protected routes
- [x] JWT middleware for backend REST API
- [x] Session/message/evaluation persistence (fire-and-forget during conversation)
- [x] Session detail page with transcript + evaluation replay
- [x] Progress dashboard (stats, recent sessions, scenarios practiced)
- [x] WebSocket JWT auth via query parameter

### Phase 7: Polish & Production Readiness
- [ ] Responsive design (tablet + mobile)
- [ ] WebSocket reconnection with exponential backoff
- [ ] Graceful degradation (text-only fallback)
- [ ] Performance optimization (latency, bundle size)
- [ ] Rate limiting + security hardening

---

Last updated: 2026-06-07 (Phase 6 complete)

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

## In Progress

### Phase 3: Full Voice Conversation Loop ✅
- [x] ElevenLabs TTS integration (streaming REST API, MP3 output)
- [x] Audio pipeline: STT → LLM → TTS → playback
- [x] Binary audio frames client → accumulate → decode → play
- [x] End-to-end voice-in voice-out conversation

## In Progress

### Phase 4: VAD & Natural Turn-Taking
- [ ] Silero VAD model (ONNX in-browser)
- [ ] Auto speech-end detection
- [ ] Interruption handling (user cuts off AI)
- [ ] VAD sensitivity config

### Phase 5: Corrections & Evaluation
- [ ] Speechace pronunciation API
- [ ] Grammar/expression correction via DeepSeek
- [ ] Post-session evaluation (scores, vocabulary, recommendations)
- [ ] Evaluation UI (gauges, error lists, vocabulary table)

### Phase 6: Persistence & Authentication
- [ ] Supabase project setup + Drizzle ORM migrations
- [ ] Auth pages (signup, login, OAuth)
- [ ] JWT middleware for backend
- [ ] Session/message/evaluation persistence
- [ ] Progress dashboard (history, trends, vocabulary)

### Phase 7: Polish & Production Readiness
- [ ] Responsive design (tablet + mobile)
- [ ] WebSocket reconnection with exponential backoff
- [ ] Graceful degradation (text-only fallback)
- [ ] Performance optimization (latency, bundle size)
- [ ] Rate limiting + security hardening

---

Last updated: 2026-06-06

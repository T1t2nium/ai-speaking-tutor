# TODO — AI Speaking Tutor

## In Progress

### Phase 1: Project Scaffolding & Audio Foundation
- [x] Initialize git repo
- [x] Set up npm workspaces
- [x] Install npm dependencies
- [x] Create docs/ with all specification documents
- [x] Create dev-logs/ with TODO.md and CHANGELOG.md
- [x] Write CLAUDE.md with project guidance
- [x] Create frontend app layout with Tailwind (layout.tsx, globals.css)
- [x] Create landing page with scenario grid (page.tsx)
- [x] Create server entry point (index.ts, app.ts, config.ts)
- [x] Create WebSocket handler on server
- [x] Create basic conversation page (session/[id]/page.tsx)
- [x] Verify server starts and frontend builds
- [ ] Implement useAudioRecorder hook
- [ ] Implement useAudioPlayback hook
- [ ] Implement useWebSocket hook
- [ ] Connect WS handler to Deepgram STT
- [ ] Wire up mic button → transcript display flow
- [ ] Verify end-to-end audio pipeline

## Backlog

### Phase 2: Text-Only AI Conversation
- [ ] Claude API service with streaming
- [ ] Scenario prompt injection
- [ ] Conversation history management
- [ ] Session REST API endpoints
- [ ] Conversation UI with message bubbles
- [ ] Session state machine

### Phase 3: Full Voice Conversation Loop
- [ ] Audio pipeline orchestrator
- [ ] ElevenLabs TTS integration
- [ ] End-to-end STT→LLM→TTS pipeline
- [ ] Streaming audio playback

### Phase 4: VAD & Natural Turn-Taking
- [ ] Silero VAD model integration
- [ ] Auto speech-end detection
- [ ] Interruption handling
- [ ] VAD sensitivity config

### Phase 5: Corrections & Evaluation
- [ ] Speechace pronunciation API
- [ ] Grammar correction via Claude
- [ ] Evaluation pipeline
- [ ] Evaluation UI

### Phase 6: Persistence & Authentication
- [ ] Supabase setup + migrations
- [ ] Auth pages and JWT middleware
- [ ] Session/message persistence
- [ ] Progress dashboard

### Phase 7: Polish & Production Readiness
- [ ] Responsive design
- [ ] WebSocket reconnection
- [ ] Graceful degradation
- [ ] Performance optimization
- [ ] Security hardening

---

Last updated: 2026-06-05

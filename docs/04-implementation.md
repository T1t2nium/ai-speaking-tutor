# Implementation Plan

## Overview

The project is divided into 7 independently testable phases. Each phase builds on the previous one. No phase depends on incomplete future work.

## Phase 1: Project Scaffolding & Audio Foundation
**Focus:** Get audio flowing through the pipeline with live transcription.

### Tasks
- [x] Initialize git repo
- [x] Set up npm workspaces (frontend + server + shared)
- [x] Create documentation (docs/, dev-logs/)
- [x] Write CLAUDE.md with project guidance
- [ ] Install dependencies (next, fastify, tailwind, typescript)
- [ ] Create frontend layout with Tailwind
- [ ] Implement useAudioRecorder hook (getUserMedia → Opus chunks)
- [ ] Implement useAudioPlayback hook (streaming AudioContext playback)
- [ ] Implement useWebSocket hook (connect, binary + text frames)
- [ ] Backend WebSocket handler (receive audio, echo transcript)
- [ ] Basic UI: mic button + transcript display

### Verification
- `npm run dev` starts both frontend and server
- Click mic → speak → see live transcript text
- Browser console shows WebSocket connection and audio chunk logs

## Phase 2: Text-Only AI Conversation
**Focus:** Claude-powered multi-turn conversation with scenario context.

### Tasks
- [ ] Claude API service with streaming responses
- [ ] Scenario system prompt injection
- [ ] Conversation history management (append-only array)
- [ ] Session REST API (POST create, GET list, GET by id, PATCH status)
- [ ] Conversation UI: message bubbles, auto-scroll, typing indicator
- [ ] Session state machine (idle → listening → processing → speaking)

### Verification
- Type or speak → AI responds with scenario-appropriate text
- Multi-turn conversation preserves context
- Different scenarios produce different AI behavior

## Phase 3: Full Voice Conversation Loop
**Focus:** End-to-end STT → LLM → TTS pipeline with voice output.

### Tasks
- [ ] Audio pipeline orchestrator (audioPipeline.ts)
- [ ] ElevenLabs streaming TTS integration
- [ ] Connect STT output → LLM input → TTS output
- [ ] Streaming audio playback on client
- [ ] Interim transcript display during speech

### Verification
- Speak → AI responds by voice → multi-turn works
- Audio quality is clear and natural
- Turn transitions feel reasonably fast

## Phase 4: VAD & Natural Turn-Taking
**Focus:** Automatic speech detection and interruption handling.

### Tasks
- [ ] Silero VAD model download and ONNX setup
- [ ] useVAD hook (speech probability, start/end detection)
- [ ] Auto audio_end on silence detection
- [ ] Interruption: abort LLM + TTS on user speech during AI playback
- [ ] Pipeline reset and state recovery after interrupt

### Verification
- Natural back-and-forth without manual start/stop
- Interrupting AI works seamlessly
- No dead air or awkward pauses

## Phase 5: Corrections & Evaluation
**Focus:** Pronunciation feedback, grammar corrections, scoring.

### Tasks
- [ ] Speechace API integration for pronunciation evaluation
- [ ] Claude grammar analysis prompt for conversation review
- [ ] Post-session evaluation pipeline (aggregate scores)
- [ ] Evaluation UI (gauges, error lists, vocabulary table)
- [ ] Per-turn correction display (non-intrusive annotations)

### Verification
- Complete session → evaluation generated
- Pronunciation scores match perceived accuracy
- Grammar corrections are accurate and helpful
- UI displays all metrics clearly

## Phase 6: Persistence & Authentication
**Focus:** User accounts, session history, progress tracking.

### Tasks
- [ ] Supabase project setup
- [ ] Drizzle ORM schema and migrations
- [ ] Auth pages (signup, login, OAuth)
- [ ] JWT middleware for backend
- [ ] Session/message/evaluation persistence
- [ ] Dashboard: history, trends, vocabulary review

### Verification
- Register → practice → logout → login → see history
- Progress data persists across sessions
- Multiple users are isolated

## Phase 7: Polish & Production Readiness
**Focus:** Edge cases, performance, mobile compatibility.

### Tasks
- [ ] Responsive design for tablet and mobile
- [ ] WebSocket reconnection with exponential backoff
- [ ] Graceful degradation (text-only fallback)
- [ ] Latency optimization
- [ ] Rate limiting and security hardening
- [ ] README with complete setup instructions

### Verification
- Works on mobile browser
- Survives network interruptions
- Handles edge cases gracefully

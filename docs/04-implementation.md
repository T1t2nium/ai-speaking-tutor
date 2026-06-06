# Implementation Plan

## Overview

The project is divided into 7 independently testable phases. Each phase builds on the previous one. No phase depends on incomplete future work.

## Phase 1: Project Scaffolding & Audio Foundation ✅
**Status:** Complete (2026-06-05)

### Tasks
- [x] Initialize git repo
- [x] Set up npm workspaces (frontend + server + shared)
- [x] Create documentation (docs/, dev-logs/)
- [x] Write CLAUDE.md with project guidance
- [x] Install dependencies (next, fastify, tailwind, typescript)
- [x] Create frontend layout with Tailwind
- [x] Implement useAudioRecorder hook (PCM capture, 16kHz)
- [x] Implement useAudioPlayback hook (AudioContext streaming)
- [x] Implement useWebSocket hook (binary + text frames)
- [x] Backend WebSocket handler with Deepgram STT integration
- [x] Basic UI: mic button + transcript display

### Verification
- [x] `npm run dev` starts both frontend and server
- [x] Click mic → speak → see live transcript text
- [x] Browser end-to-end audio pipeline verified

## Phase 2: Text-Only AI Conversation ✅
**Status:** Complete (2026-06-06). Note: Claude replaced with DeepSeek.

### Tasks
- [x] DeepSeek API service with streaming responses
- [x] Scenario system prompt injection
- [x] Conversation history management (per-session)
- [x] Multi-turn support with STT rebuild per turn
- [x] Conversation UI with AI message bubbles
- [x] isBinary routing fix for audio vs control messages

### Verification
- [x] Speak → DeepSeek responds with scenario-appropriate text
- [x] Multi-turn conversation preserves context
- [x] Different scenarios produce different AI behavior

## Phase 3: Full Voice Conversation Loop ✅
**Status:** Complete (2026-06-06)

### Tasks
- [x] Audio pipeline orchestrator (in handler.ts)
- [x] ElevenLabs streaming TTS integration
- [x] Connect STT output → LLM input → TTS output
- [x] Streaming audio playback on client (accumulate + decode)
- [x] Interim transcript display during speech

### Verification
- [x] Speak → AI responds by voice → multi-turn works
- [x] Audio quality is clear and natural
- [x] Turn transitions feel reasonably fast

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

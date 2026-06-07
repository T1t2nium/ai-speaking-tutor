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
**Status:** Complete (2026-06-07)

### Tasks
- [x] RMS energy-based VAD hook (zero-dependency, hysteresis thresholds)
- [x] Auto audio_end on silence detection (1200ms)
- [x] Long-press push-to-talk + single-tap VAD auto dual input modes
- [x] Interruption: server AbortController for LLM + TTS
- [x] LLM failure auto-recovery (resumes listening)
- [x] Transcript merging (fragmented speech → one message)

### Verification
- [x] Natural back-and-forth without manual start/stop
- [x] Push-to-talk and VAD auto modes both working
- [x] Multi-turn voice conversation stable
- No dead air or awkward pauses

## Phase 5: Corrections & Evaluation ✅
**Status:** Complete (2026-06-07)

### Tasks
- [x] Speechace API integration for pronunciation evaluation
- [x] DeepSeek grammar analysis prompt for per-turn corrections
- [x] DeepSeek evaluation generation for post-session scores
- [x] Audio buffering per turn for pronunciation evaluation
- [x] Inline correction UI (non-intrusive, expandable)
- [x] Evaluation panel UI (score gauges, error lists, vocabulary, recommendations)
- [x] Shared types: evaluation_result message, correction messageIndex

### Verification
- [x] User speaks with grammar error → correction appears inline after AI response
- [x] End session → evaluation panel appears with scores, summary, recommendations
- [x] Pronunciation errors listed with word-level scores and suggestions
- [x] Multi-turn: corrections accumulate across turns in evaluation summary
- [x] `npm run build` passes (both server and frontend)

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

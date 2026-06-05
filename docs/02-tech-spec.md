# Technical Specification

## Architecture Overview

The AI Speaking Tutor follows a three-tier architecture:

```
Browser (Next.js) ←→ Server (Fastify/Node.js) ←→ External APIs + Database
```

### Tier 1: Browser Client
- Next.js 14 with App Router
- React 18 with TypeScript
- Tailwind CSS for styling
- Zustand for client-side state management
- WebSocket client for real-time audio streaming
- Web Audio API for microphone capture and audio playback
- Silero VAD (ONNX) for in-browser voice activity detection

### Tier 2: Application Server
- Fastify (Node.js) with TypeScript
- WebSocket server (@fastify/websocket) for audio streaming
- REST API for sessions, scenarios, auth, user data
- Pipeline orchestrator: STT → LLM → TTS
- JWT authentication middleware

### Tier 3: External Services
- Deepgram (streaming STT)
- Anthropic Claude (LLM conversation + grammar analysis)
- ElevenLabs (streaming TTS)
- Speechace (pronunciation evaluation)
- Supabase (PostgreSQL + Auth)

## Data Flow: Voice Conversation Loop

```
1. User taps mic → getUserMedia() → AudioContext → OpusEncoder
2. Every 100ms: Opus chunk sent via WebSocket binary frame
3. Server forwards chunks to Deepgram streaming connection
4. Deepgram returns interim transcripts → relayed to client for display
5. VAD detects 600ms silence → client sends audio_end
6. Server finalizes Deepgram → full transcript
7. Server sends transcript + history + scenario context → Claude (streaming)
8. Claude returns response tokens → accumulated as text
9. Response text chunks → ElevenLabs (streaming) → audio chunks
10. Audio chunks sent back to client via WebSocket binary frames
11. Client plays audio via AudioContext, displays response text
12. Repeat from step 1
```

### Interruption Flow
```
During step 8-11, if VAD detects user speech:
  → Client sends interrupt WS message
  → Client stops all buffered audio playback
  → Server aborts Claude request (AbortController)
  → Server closes ElevenLabs stream
  → Pipeline resets to listening state
  → User's new speech flows through from step 2
```

## WebSocket Protocol

Binary frames: Single-channel Opus audio (48kHz, 20ms frames, Opus in Ogg container)

Text frames: JSON as defined in `shared/types.ts` (WsClientMessage / WsServerMessage)

Connection: `wss://host/ws/session/:sessionId?token=JWT`

## Technology Decisions

### Why Node.js over Python
- Python not available in this development environment.
- Node.js event loop is ideal for streaming audio pipeline (async I/O, no thread pool overhead).
- Shared TypeScript types between frontend and backend.
- Single language across the stack reduces context-switching.

### Why WebSocket over WebRTC
- WebSocket is significantly simpler to implement and debug.
- WebRTC's main benefit (sub-200ms latency) is not needed for a <2s latency target.
- WebRTC requires STUN/TURN server infrastructure.
- WebSocket can be upgraded to WebRTC later if latency requirements change.

### Why Deepgram over Whisper
- Deepgram provides streaming transcription with interim results.
- Whisper API only accepts complete audio files (adds 500ms+ of "record-then-send" latency).
- Deepgram Nova-2 has strong accented English handling for non-native speakers.

### Why Claude over GPT-4o
- Superior instruction-following for consistent tutoring persona.
- Less likely to go off-script or role-play inappropriately.
- 200K context window retains full session history without summarization.

### Why Speechace over Custom Solution
- Pronunciation assessment requires phoneme-level forced alignment — a complex ML problem.
- Building in-house would require significant data, training, and ML engineering.
- Speechace is purpose-built for language learning with well-tested accuracy.

## Latency Budget

| Stage | Target | Notes |
|---|---|---|
| VAD silence detection | 400-600ms | In-browser, tunable parameter |
| Network (audio_end) | ~50ms | One-way client→server |
| Deepgram finalization | 200-400ms | After receiving final chunk |
| Claude first token | 400-800ms | Streaming mode, context-dependent |
| ElevenLabs first audio | 200-400ms | Streaming mode |
| Network + playback start | ~50ms | Server→client + AudioContext buffer |
| **Total** | **1300-2250ms** | Acceptable range for MVP |

### Optimization Strategies (Phase 7)
- Reduce VAD silence to 400ms (more aggressive)
- Start TTS on interim transcript while waiting for LLM to finish
- Pre-warm Deepgram + ElevenLabs connections at session start
- Use Claude Haiku for faster first token (trade accuracy for speed)
- Cache common TTS phrases (greetings, transitions)
- Deploy backend in region close to users

## Security

- All API keys stored server-side in environment variables
- JWT authentication on WebSocket handshake (query parameter)
- JWT authentication middleware on all REST endpoints
- Rate limiting: 100 req/min STT, 30 req/min LLM per user
- CORS configured for frontend origin only
- Row-Level Security on Supabase for data isolation

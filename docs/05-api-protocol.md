# API Protocol Specification

## REST API

Base URL: `http://localhost:3001/api`

### Authentication

All endpoints except `POST /auth/register` and `POST /auth/login` require a valid JWT in the `Authorization: Bearer <token>` header.

### Endpoints

#### Auth
```
POST /api/auth/register
  Body: { email, password, name? }
  → 201 { user, token }

POST /api/auth/login
  Body: { email, password }
  → 200 { user, token, refresh_token }

POST /api/auth/refresh
  Body: { refresh_token }
  → 200 { token, refresh_token }
```

#### Scenarios
```
GET /api/scenarios
  Query: ?difficulty=easy
  → 200 { scenarios: Scenario[] }
  Cache: public, max-age=3600

GET /api/scenarios/:slug
  → 200 Scenario (with systemPrompt)
```

#### Sessions
```
POST /api/sessions
  Auth: Required
  Body: { scenario_id }
  → 201 { session_id, scenario, started_at }

GET /api/sessions
  Auth: Required
  Query: ?limit=20&offset=0&status=completed
  → 200 { sessions: SessionListItem[], total }

GET /api/sessions/:id
  Auth: Required (owner)
  → 200 { session, messages, evaluation? }

PATCH /api/sessions/:id
  Auth: Required (owner)
  Body: { status: "completed" | "abandoned" }
  → 200 { session }
```

#### Evaluation
```
POST /api/sessions/:id/evaluate
  Auth: Required (owner)
  → 202 { status: "processing" }

GET /api/sessions/:id/evaluation
  Auth: Required (owner)
  → 200 Evaluation | 404 (not yet evaluated)
```

#### User Progress
```
GET /api/user/progress
  Auth: Required
  Query: ?days=30
  → 200 UserProgress

GET /api/user/vocabulary
  Auth: Required
  Query: ?mastered=false&page=1&limit=20
  → 200 { items: VocabularyItem[], total, page }

PATCH /api/user/vocabulary/:id
  Auth: Required
  Body: { is_mastered: true }
  → 200 { item }
```

---

## WebSocket Protocol

Connection: `ws://localhost:3001/ws/session/:sessionId?token=JWT`

### Binary Frames
Single-channel Opus audio (48kHz, 20ms frames, Opus in Ogg container).

### Text Frames (Client → Server)

```json
{ "type": "audio_chunk", "seq": 1 }
```
Followed by binary frame. Sent every ~100ms during speech.

```json
{ "type": "audio_end" }
```
VAD detected end of speech or user manually stopped recording.

```json
{ "type": "interrupt" }
```
User wants to cut off AI response. Server aborts LLM + TTS.

```json
{ "type": "config", "vadThreshold": 0.6, "silenceDurationMs": 600 }
```
Dynamic VAD configuration update.

```json
{ "type": "end_session" }
```
User-initiated session end. Triggers evaluation.

```json
{ "type": "ping" }
```
Heartbeat. Server responds with `pong`.

### Text Frames (Server → Client)

```json
{ "type": "connected", "sessionId": "uuid", "scenario": { ... } }
```
Connection acknowledged. Scenario context provided.

```json
{ "type": "interim_transcript", "text": "I would like...", "confidence": 0.92 }
```
Real-time partial STT result. Updates as user speaks.

```json
{ "type": "final_transcript", "text": "I would like to order a pizza.", "confidence": 0.95 }
```
Finalized STT result after speech end.

```json
{ "type": "ai_response_start", "text": "What kind of pizza would you like?" }
```
Full AI response text. Sent before/during TTS audio.

```json
{ "type": "ai_audio_chunk", "seq": 1 }
```
Followed by binary frame of MP3 audio from TTS.

```json
{ "type": "ai_response_end" }
```
AI has finished speaking. Ready for next user turn.

```json
{
  "type": "correction",
  "id": "uuid",
  "original": "I go to school yesterday",
  "corrected": "I went to school yesterday",
  "type": "grammar",
  "category": "tense",
  "explanation": "Use past tense for completed actions."
}
```
Non-intrusive correction annotation.

```json
{
  "type": "evaluation_partial",
  "fluency": 72.0,
  "pronunciation": 81.3,
  "grammar": 75.0,
  "vocabulary": 68.2
}
```
Live scores updated after each turn (if evaluation mode is on).

```json
{ "type": "error", "code": "stt_error", "message": "Transcription service unavailable" }
```
Recoverable error. Pipeline continues.

```json
{ "type": "fatal_error", "code": "session_not_found", "message": "..." }
```
Unrecoverable error. Connection will close.

```json
{ "type": "pong" }
```
Heartbeat response.

```json
{ "type": "reconnect", "delayMs": 1000 }
```
Server requests client reconnect (e.g., during graceful restart).

### Error Codes

| Code | Description |
|---|---|
| `stt_error` | Deepgram transcription failed (retryable) |
| `tts_error` | ElevenLabs TTS failed (retryable) |
| `llm_error` | Claude API error (retryable) |
| `session_not_found` | Invalid session ID |
| `unauthorized` | Invalid or expired JWT |
| `rate_limited` | Too many requests |
| `audio_format_error` | Unsupported audio encoding |
| `internal_error` | Unexpected server error |

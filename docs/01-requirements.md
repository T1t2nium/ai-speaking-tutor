# Product Requirements

## Vision

An AI-powered English speaking tutor that provides natural, real-time voice conversation practice with immediate feedback on pronunciation, grammar, and expression — helping learners improve spoken English through measurable, guided practice.

## User Stories

### Core Practice Flow
- As a learner, I can select a conversation scenario (e.g., ordering food, job interview) to practice context-appropriate English.
- As a learner, I can speak naturally to the AI tutor and hear a voice response, creating a realistic conversation.
- As a learner, I can interrupt the AI mid-response, just like in natural conversation.

### Feedback & Improvement
- As a learner, I can see my mispronounced words with specific phoneme-level feedback so I know exactly what sounds to work on.
- As a learner, I can see grammar corrections and expression suggestions without disrupting the conversation flow.
- As a learner, I can view a post-session summary with quantifiable scores: fluency, pronunciation accuracy, grammar accuracy, and vocabulary richness.

### Progress & Motivation
- As a learner, I can track my progress over time with score trends and skill breakdowns.
- As a learner, I can review vocabulary I've used and mark words as mastered.
- As a learner, I can see my weak areas and get recommendations for what to practice next.

### Account & Access
- As a learner, I can create an account to save my progress across sessions.
- As a learner, I can log in with email/password or Google OAuth.

## Functional Requirements

### FR-1: Multi-Scenario Dialogue
- System provides pre-defined conversation scenarios with different contexts and difficulty levels.
- Each scenario has a system prompt that governs the AI's behavior, tone, and language level.
- Users can browse scenarios by difficulty and topic tags.

### FR-2: Real-Time Voice Interaction
- System captures microphone audio and streams it to the server via WebSocket.
- System uses streaming STT (Deepgram) for real-time transcription with interim results.
- System uses streaming TTS (ElevenLabs) to play AI responses with minimal latency.
- End-to-end latency target: <2 seconds from speech end to first AI audio.

### FR-3: Natural Turn-Taking
- In-browser Voice Activity Detection (VAD) automatically detects when the user starts/stops speaking.
- User can interrupt AI mid-response by speaking.
- Configurable VAD sensitivity and silence duration thresholds.

### FR-4: Pronunciation Evaluation
- System evaluates user pronunciation at the phoneme level.
- Feedback includes: mispronounced words, error type (substitution/deletion/insertion/distortion), and practice suggestions.
- Pronunciation scores are aggregated into an overall pronunciation score per session.

### FR-5: Grammar & Expression Correction
- System identifies grammar errors and unnatural expressions in user speech.
- Corrections are displayed non-intrusively (after the user finishes speaking, not mid-sentence).
- Each correction includes: original text, corrected text, error type, category, and explanation.

### FR-6: Post-Session Evaluation
- After each session, system generates a comprehensive evaluation report.
- Scores: overall (0-100), fluency, pronunciation, grammar accuracy, vocabulary richness.
- Detailed feedback: pronunciation errors list, grammar corrections list, vocabulary used, AI-generated summary, and improvement recommendations.

### FR-7: Progress Tracking
- Dashboard shows session history with scores and trends.
- Skill breakdown charts over time (fluency, pronunciation, grammar, vocabulary).
- Vocabulary review page with mastery tracking.
- Weak areas identification.

### FR-8: User Authentication
- Email/password registration and login.
- Google OAuth login.
- JWT-based session management.
- Protected routes for user data.

## Non-Functional Requirements

### NFR-1: Latency
- End-to-end voice latency (user stops speaking → AI audio starts) must be <2 seconds.
- VAD speech-end detection must complete within 600ms.
- STT finalization within 400ms.
- LLM first token within 800ms.
- TTS first audio within 400ms.

### NFR-2: Accuracy
- STT accuracy >90% for standard English, >85% for accented English (target learners).
- Pronunciation evaluation must surface only high-confidence errors (>0.7 confidence) to avoid false positives.
- Grammar corrections must have >90% precision (avoid false flags that undermine learner trust).

### NFR-3: Reliability
- WebSocket connections must auto-reconnect with exponential backoff.
- Audio pipeline must handle edge cases: silence, background noise, very long utterances.
- System must gracefully degrade to text-only mode if audio fails.

### NFR-4: Scalability
- Initial target: support 100 concurrent users.
- Database rows estimate: 10K sessions, 100K messages for 1K active users — well within Supabase free tier.

### NFR-5: Security
- All external API keys stored server-side only.
- JWT authentication on all protected endpoints and WebSocket connections.
- Rate limiting on API routes.
- Row-Level Security (RLS) on database for multi-user data isolation.

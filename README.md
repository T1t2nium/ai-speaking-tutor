# AI English Speaking Tutor

An AI-powered English speaking practice application with real-time voice interaction, pronunciation evaluation, grammar correction, and progress tracking.

## Demo

### Feature Walkthrough

https://github.com/user-attachments/assets/placeholder

> Upload `讲解.mp4` to YouTube and replace the link above with the video URL. GitHub will automatically show an inline preview card.

### Quick Demo

[![Function Demo](video/功能展示.mp4)](video/功能展示.mp4)

*Click the link above to watch the feature demonstration.*

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Zustand |
| **Backend** | Fastify (Node.js), TypeScript, WebSocket |
| **Audio Pipeline** | WebSocket binary frames (Int16 PCM), AudioContext API |
| **STT** | Deepgram Nova-2 (streaming WebSocket, linear16) |
| **LLM** | DeepSeek (deepseek-v4-flash for conversation, deepseek-chat for evaluation) |
| **TTS** | ElevenLabs (primary) + Browser SpeechSynthesis (fallback) |
| **Pronunciation** | Speechace API (phoneme-level scoring) |
| **Database** | PostgreSQL (Supabase) + Drizzle ORM |
| **Auth** | JWT + bcrypt (custom implementation) |

## Features

- **Real-time Voice Conversation** — Tap to speak, AI responds by voice. Continuous multi-turn dialogue with context awareness.
- **4 Practice Scenarios** — Ordering Food, Job Interview, Travel, Daily Conversation (easy / medium / hard).
- **Inline Grammar Correction** — Grammar and expression mistakes corrected in real-time, displayed below your messages.
- **Post-Session Evaluation** — 5-dimension scoring (fluency, pronunciation, grammar, vocabulary, overall) with detailed recommendations.
- **Pronunciation Feedback** — Phoneme-level error detection via Speechace.
- **Progress Dashboard** — Session history, score trends, vocabulary review.
- **User Accounts** — Register/login with JWT authentication, data isolated per user.

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- PostgreSQL database (local or Supabase free tier)

### API Keys Required

Sign up for free API keys:

| Service | Sign Up Link | Free Tier |
|---------|-------------|-----------|
| Deepgram (STT) | [console.deepgram.com](https://console.deepgram.com) | $200 credit |
| DeepSeek (LLM) | [platform.deepseek.com](https://platform.deepseek.com) | Pay-as-you-go |
| ElevenLabs (TTS) | [elevenlabs.io](https://elevenlabs.io) | 10K chars/month |
| Speechace (Pronunciation) | [speechace.com](https://speechace.com) | Free trial |
| Supabase (Database) | [supabase.com](https://supabase.com) | Free tier (2GB) |

### Setup

```bash
# Clone and install
git clone https://github.com/T1t2nium/ai-speaking-tutor.git
cd ai-speaking-tutor
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys:
#   DEEPGRAM_API_KEY, DEEPSEEK_API_KEY, ELEVENLABS_API_KEY,
#   SPEECHACE_API_KEY, DATABASE_URL, JWT_SECRET

# Push database schema
cd server && npx drizzle-kit push

# Start development (two terminals)
npm run dev:server    # Backend on http://localhost:3001
npm run dev:frontend  # Frontend on http://localhost:3000
```

Open `http://localhost:3000`, register an account, and start practicing.

## Project Structure

```
├── frontend/          # Next.js web application
│   ├── src/app/       # App Router pages (login, register, dashboard, session)
│   ├── src/hooks/     # Audio & WebSocket hooks
│   ├── src/store/     # Zustand state management
│   └── src/lib/       # Audio encoding utilities
├── server/            # Fastify backend server
│   ├── src/services/  # STT, LLM, TTS, pronunciation, evaluation, auth
│   ├── src/db/        # Drizzle ORM schema & connection
│   ├── src/middleware/ # JWT auth middleware
│   └── src/websocket/ # WebSocket handler (conversation orchestrator)
├── shared/            # Shared TypeScript types & scenario definitions
├── docs/              # Requirements, tech spec, design system, implementation plan
└── dev-logs/          # TODO tracking & changelog
```

## Architecture

```
Browser Mic → Int16 PCM → WebSocket ──→ Server Pipeline:
                                          ├─ Deepgram STT (streaming)
                                          ├─ DeepSeek LLM (streaming)
                                          ├─ DeepSeek Grammar Analysis
                                          ├─ ElevenLabs TTS (streaming)
                                          └─ Speechace Pronunciation
                                       ←── WebSocket → Audio Playback / UI
                                          ↓
                                     PostgreSQL (sessions, messages, evaluations)
```

## Documentation

| Document | Description |
|----------|------------|
| [Requirements](docs/01-requirements.md) | Product requirements & user stories |
| [Technical Spec](docs/02-tech-spec.md) | Architecture & technical decisions |
| [Design System](docs/03-design-system.md) | UI/UX guidelines |
| [Implementation Plan](docs/04-implementation.md) | Phased development plan |
| [API Protocol](docs/05-api-protocol.md) | REST & WebSocket API specs |
| [Presentation Script](docs/presentation-script.md) | Demo video script (Chinese) |

## Development Phases

| Phase | Status |
|-------|--------|
| Phase 1: Project Scaffolding & Audio Foundation | ✅ Complete |
| Phase 2: Text-Only AI Conversation | ✅ Complete |
| Phase 3: Full Voice Conversation Loop | ✅ Complete |
| Phase 4: VAD & Natural Turn-Taking | ✅ Complete |
| Phase 5: Corrections & Evaluation | ✅ Complete |
| Phase 6: Persistence & Authentication | ✅ Complete |
| Phase 7: Polish & Production Readiness | 🔜 Next |

## License

MIT

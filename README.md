# AI English Speaking Tutor

An AI-powered English speaking practice application with real-time voice interaction, pronunciation evaluation, grammar correction, and progress tracking.

## Tech Stack

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend:** Node.js, Fastify, TypeScript
- **Real-time Audio:** WebSocket (binary Opus frames)
- **STT:** Deepgram Nova-2
- **TTS:** ElevenLabs (primary), Edge TTS (fallback)
- **LLM:** Claude (Anthropic API)
- **Pronunciation:** Speechace API
- **Database:** Supabase (PostgreSQL)

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- API keys for: Deepgram, Anthropic, ElevenLabs, Speechace
- Supabase project (for Phase 6+)

### Setup

```bash
# Clone and install
git clone <repo-url>
cd ai-speaking-tutor
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start development
npm run dev:server    # Terminal 1: Backend on :3001
npm run dev:frontend  # Terminal 2: Frontend on :3000
```

## Project Structure

```
├── frontend/     # Next.js web application
├── server/       # Fastify backend server
├── shared/       # Shared TypeScript types and scenarios
├── docs/         # Technical documentation
├── dev-logs/     # Development journal and TODO tracking
└── scripts/      # Dev/ops helper scripts
```

## Documentation

- [Requirements](docs/01-requirements.md) — Product requirements & user stories
- [Technical Spec](docs/02-tech-spec.md) — Architecture & technical decisions
- [Design System](docs/03-design-system.md) — UI/UX guidelines
- [Implementation Plan](docs/04-implementation.md) — Development phases
- [API Protocol](docs/05-api-protocol.md) — REST & WebSocket API specs

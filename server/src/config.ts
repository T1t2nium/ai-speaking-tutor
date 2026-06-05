import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.SERVER_PORT || '3001', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  deepgram: {
    apiKey: process.env.DEEPGRAM_API_KEY || '',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  },
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY || '',
  },
  speechace: {
    apiKey: process.env.SPEECHACE_API_KEY || '',
  },
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
} as const;

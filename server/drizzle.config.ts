import type { Config } from 'drizzle-kit';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const dbUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/tutor';
const url = new URL(dbUrl);

export default {
  schema: './src/db/schema.ts',
  out: path.resolve(__dirname, 'drizzle'),
  dialect: 'postgresql',
  dbCredentials: {
    host: url.hostname,
    port: parseInt(url.port || '5432', 10),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    ssl: { rejectUnauthorized: false },
  },
} satisfies Config;

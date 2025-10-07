import path from 'node:path';
import { config as loadEnv } from 'dotenv';

const envPath = path.resolve(process.cwd(), '.env');
loadEnv({ path: envPath });

const required = (value: string | undefined, key: string) => {
  if (!value || value.trim().length === 0) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value;
};

const toNumber = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  token: required(process.env.DISCORD_TOKEN, 'DISCORD_TOKEN'),
  clientId: required(process.env.DISCORD_CLIENT_ID, 'DISCORD_CLIENT_ID'),
  guildId: process.env.DISCORD_GUILD_ID ?? null,
  dockerApiBaseUrl: process.env.DOCKER_API_BASE_URL ?? 'http://localhost:4000/api',
  dockerApiKey: process.env.DOCKER_API_KEY ?? null,
};

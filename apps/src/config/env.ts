import path from 'node:path';
import { config as loadEnv } from 'dotenv';

const envPath = path.resolve(process.cwd(), '.env');
loadEnv({ path: envPath });

const toNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: toNumber(process.env.PORT, 4000),
  pollingIntervalMs: toNumber(process.env.DOCKER_STATS_INTERVAL_MS, 10_000),
  dockerCli: process.env.DOCKER_CLI ?? 'docker',
  dockerComposeCommand: process.env.DOCKER_COMPOSE_COMMAND ?? 'docker compose',
  wsPrefix: process.env.DOCKER_LOG_WS_PREFIX ?? '/ws',
  dockerStopTimeoutSec: toNumber(process.env.DOCKER_STOP_TIMEOUT_SEC, 30),
  rconCli: process.env.MCRCON_CLI ?? 'mcrcon',
  rconHost: process.env.MCRCON_HOST ?? '127.0.0.1',
};

export const isProduction = env.nodeEnv === 'production';

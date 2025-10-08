type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const envLevel = (process.env.LOG_LEVEL ?? 'info').toLowerCase() as LogLevel;
const activeLevel: LogLevel = envLevel in levelOrder ? envLevel : 'info';

const shouldLog = (level: LogLevel) => levelOrder[level] >= levelOrder[activeLevel];

const formatMeta = (meta?: Record<string, unknown>) => {
  if (!meta || Object.keys(meta).length === 0) {
    return '';
  }
  return ` ${JSON.stringify(meta)}`;
};

const logAtLevel = (level: LogLevel, scope: string, message: string, meta?: Record<string, unknown>) => {
  if (!shouldLog(level)) return;

  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level.toUpperCase()}] [${scope}] ${message}${formatMeta(meta)}`;

  switch (level) {
    case 'debug':
    case 'info':
      console.log(line);
      break;
    case 'warn':
      console.warn(line);
      break;
    case 'error':
      console.error(line);
      break;
  }
};

export const createLogger = (scope: string) => ({
  debug: (message: string, meta?: Record<string, unknown>) => logAtLevel('debug', scope, message, meta),
  info: (message: string, meta?: Record<string, unknown>) => logAtLevel('info', scope, message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => logAtLevel('warn', scope, message, meta),
  error: (message: string, meta?: Record<string, unknown>) => logAtLevel('error', scope, message, meta),
});

export const rootLogger = createLogger('app');


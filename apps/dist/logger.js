const levelOrder = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};
const envLevel = (process.env.LOG_LEVEL ?? 'info').toLowerCase();
const activeLevel = envLevel in levelOrder ? envLevel : 'info';
const shouldLog = (level) => levelOrder[level] >= levelOrder[activeLevel];
const formatMeta = (meta) => {
    if (!meta || Object.keys(meta).length === 0) {
        return '';
    }
    return ` ${JSON.stringify(meta)}`;
};
const logAtLevel = (level, scope, message, meta) => {
    if (!shouldLog(level))
        return;
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
export const createLogger = (scope) => ({
    debug: (message, meta) => logAtLevel('debug', scope, message, meta),
    info: (message, meta) => logAtLevel('info', scope, message, meta),
    warn: (message, meta) => logAtLevel('warn', scope, message, meta),
    error: (message, meta) => logAtLevel('error', scope, message, meta),
});
export const rootLogger = createLogger('app');
//# sourceMappingURL=logger.js.map
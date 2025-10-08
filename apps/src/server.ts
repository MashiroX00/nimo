import { createServer } from 'node:http';
import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { dockerStatsService } from './services/docker-stats.service.js';
import { DockerLogGateway } from './websocket/docker-log.gateway.js';
import { createLogger } from './logger.js';

const log = createLogger('Server');

const bootstrap = async () => {
  await prisma.$connect();

  const server = createServer(app);
  const logGateway = new DockerLogGateway(server);
  logGateway.bindListeners();

  server.listen(env.port, () => {
    log.info('Docker Management API started', {
      port: env.port,
      docs: `/docs`,
      wsPrefix: env.wsPrefix,
    });
    dockerStatsService.start();
  });

  const shutdown = async (signal: string) => {
    log.warn('Shutting down server', { signal });
    dockerStatsService.stop();
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
};

bootstrap().catch((error) => {
  log.error('Failed to start application', { error: (error as Error).message });
  process.exit(1);
});

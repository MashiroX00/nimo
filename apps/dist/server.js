import { createServer } from 'node:http';
import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { dockerStatsService } from './services/docker-stats.service.js';
import { DockerLogGateway } from './websocket/docker-log.gateway.js';
const bootstrap = async () => {
    await prisma.$connect();
    const server = createServer(app);
    const logGateway = new DockerLogGateway(server);
    logGateway.bindListeners();
    server.listen(env.port, () => {
        console.log(`Docker Management API running on http://localhost:${env.port}`);
        console.log(`Swagger UI available at http://localhost:${env.port}/docs`);
        console.log(`WebSocket logs prefix: ${env.wsPrefix}/<docker-name>`);
        dockerStatsService.start();
    });
    const shutdown = async (signal) => {
        console.log(`Received ${signal}, shutting down...`);
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
    console.error('Failed to start application', error);
    process.exit(1);
});
//# sourceMappingURL=server.js.map
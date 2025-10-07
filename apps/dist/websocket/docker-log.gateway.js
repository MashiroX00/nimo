import { WebSocketServer } from 'ws';
import { env } from '../config/env.js';
import { DockerRepository } from '../repositories/docker.repository.js';
import { tailContainerLogs } from '../utils/docker.js';
export class DockerLogGateway {
    server;
    prefix;
    wss = new WebSocketServer({ noServer: true });
    constructor(server, prefix = env.wsPrefix) {
        this.server = server;
        this.prefix = prefix;
        this.server.on('upgrade', this.handleUpgrade);
    }
    handleUpgrade = async (request, socket, head) => {
        const urlPath = request.url ?? '/';
        let pathname;
        try {
            const origin = `http://${request.headers.host ?? 'localhost'}`;
            pathname = new URL(urlPath, origin).pathname;
        }
        catch {
            socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
            socket.destroy();
            return;
        }
        if (!pathname.startsWith(this.prefix)) {
            socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
            socket.destroy();
            return;
        }
        const subPath = pathname.slice(this.prefix.length);
        const segments = subPath.split('/').filter(Boolean);
        const dockerName = segments[0];
        if (!dockerName) {
            socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
            socket.destroy();
            return;
        }
        const docker = await DockerRepository.findByName(dockerName).catch(() => null);
        if (!docker) {
            socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
            socket.destroy();
            return;
        }
        this.wss.handleUpgrade(request, socket, head, (ws) => {
            this.wss.emit('connection', ws, request, dockerName);
        });
    };
    bindListeners() {
        this.wss.on('connection', (ws, _request, dockerName) => {
            ws.send(`Streaming logs for ${dockerName}`);
            const child = tailContainerLogs(dockerName, () => {
                if (ws.readyState === ws.OPEN) {
                    ws.close();
                }
            }, { follow: true });
            const forward = (data, channel) => {
                if (ws.readyState === ws.OPEN) {
                    ws.send(JSON.stringify({ channel, data: data.toString() }));
                }
            };
            child.stdout.on('data', (chunk) => forward(chunk, 'stdout'));
            child.stderr.on('data', (chunk) => forward(chunk, 'stderr'));
            ws.on('close', () => {
                child.kill('SIGTERM');
            });
            ws.on('error', () => {
                child.kill('SIGTERM');
            });
        });
    }
}
//# sourceMappingURL=docker-log.gateway.js.map
import type { IncomingMessage } from 'node:http';
import type { Socket } from 'node:net';
import type { Server } from 'node:http';
import { WebSocketServer } from 'ws';
import type { WebSocket } from 'ws';
import { env } from '../config/env.js';
import { DockerRepository } from '../repositories/docker.repository.js';
import { tailContainerLogs } from '../utils/docker.js';

export class DockerLogGateway {
  private readonly wss = new WebSocketServer({ noServer: true });

  constructor(private readonly server: Server, private readonly prefix = env.wsPrefix) {
    this.server.on('upgrade', this.handleUpgrade);
  }

  private handleUpgrade = async (request: IncomingMessage, socket: Socket, head: Buffer) => {
    const urlPath = request.url ?? '/';
    let pathname: string;
    try {
      const origin = `http://${request.headers.host ?? 'localhost'}`;
      pathname = new URL(urlPath, origin).pathname;
    } catch {
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

    this.wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
      this.wss.emit('connection', ws, request, dockerName);
    });
  };

  bindListeners() {
    this.wss.on('connection', (ws: WebSocket, _request: IncomingMessage, dockerName: string) => {
      ws.send(`Streaming logs for ${dockerName}`);

      const child = tailContainerLogs(
        dockerName,
        () => {
          if (ws.readyState === ws.OPEN) {
            ws.close();
          }
        },
        { follow: true },
      );

      const forward = (data: Buffer, channel: 'stdout' | 'stderr') => {
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

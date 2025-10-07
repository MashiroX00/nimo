import type { Server } from 'node:http';
export declare class DockerLogGateway {
    private readonly server;
    private readonly prefix;
    private readonly wss;
    constructor(server: Server, prefix?: string);
    private handleUpgrade;
    bindListeners(): void;
}
//# sourceMappingURL=docker-log.gateway.d.ts.map
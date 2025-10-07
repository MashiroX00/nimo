import type { Prisma, docker as DockerEntity, servermonitor as ServerMonitorEntity, status } from '../../generated/prisma/index.js';
export type CreateDockerInput = Omit<Prisma.dockerCreateInput, 'servermonitors' | 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateDockerInput = Partial<CreateDockerInput> & {
    status?: status | null;
    pid?: number | null;
};
export declare class DockerRepository {
    static create(data: CreateDockerInput): Promise<DockerEntity>;
    static findMany(): Promise<DockerEntity[]>;
    static findActive(): Promise<DockerEntity[]>;
    static findById(id: string): Promise<DockerEntity | null>;
    static findByName(name: string): Promise<DockerEntity | null>;
    static update(id: string, data: UpdateDockerInput): Promise<DockerEntity>;
    static delete(id: string): Promise<DockerEntity>;
    static upsertMonitor(dockerId: string, payload: Partial<ServerMonitorEntity> & {
        name: string;
    }): Promise<ServerMonitorEntity>;
    static listMonitors(): Promise<ServerMonitorEntity[]>;
    static findMonitorByDockerId(dockerId: string): Promise<ServerMonitorEntity | null>;
}
//# sourceMappingURL=docker.repository.d.ts.map
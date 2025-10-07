import { type ContainerStats } from '../utils/docker.js';
import { type UpdateDockerInput } from '../repositories/docker.repository.js';
import type { docker as DockerEntity } from '../../generated/prisma/index.js';
export type CreateDockerDto = {
    name: string;
    type?: string | null;
    stopcommand?: string | null;
    localport?: number | null;
    bindport?: number | null;
    dockercompose?: string | null;
    dockerlocation?: string | null;
    description?: string | null;
};
export type UpdateDockerDto = Partial<CreateDockerDto> & {
    status?: UpdateDockerInput['status'];
    pid?: number | null;
};
export declare class DockerService {
    static createDocker(input: CreateDockerDto): Promise<DockerEntity>;
    static listDockers(): Promise<DockerEntity[]>;
    static getDockerById(id: string): Promise<DockerEntity>;
    static updateDocker(id: string, input: UpdateDockerDto): Promise<DockerEntity>;
    static deleteDocker(id: string): Promise<DockerEntity>;
    static startDocker(id: string, options?: {
        build?: boolean;
    }): Promise<DockerEntity>;
    static stopDocker(id: string): Promise<DockerEntity>;
    static restartDocker(id: string, options?: {
        build?: boolean;
    }): Promise<DockerEntity>;
    static updateStats(docker: DockerEntity): Promise<ContainerStats | null>;
}
//# sourceMappingURL=docker.service.d.ts.map
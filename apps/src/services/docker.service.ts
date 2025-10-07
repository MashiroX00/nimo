import {
  composeDown,
  composeUp,
  getContainerPid,
  getContainerStats,
  isContainerRunning,
  sendCommandToContainer,
  waitForContainerToStart,
  waitForContainerToStop,
  type ContainerStats,
} from '../utils/docker.js';
import { DockerRepository, type CreateDockerInput, type UpdateDockerInput } from '../repositories/docker.repository.js';
import type { docker as DockerEntity } from '../../generated/prisma/index.js';
import { HttpError } from '../utils/httpError.js';

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

const ensureDockerExists = (docker: DockerEntity | null, identifier: string): DockerEntity => {
  if (!docker) {
    throw new HttpError(404, `Docker entry "${identifier}" not found`);
  }
  return docker;
};

export class DockerService {
  static async createDocker(input: CreateDockerDto): Promise<DockerEntity> {
    const existing = await DockerRepository.findByName(input.name);
    if (existing) {
      throw new HttpError(409, `Docker entry with name "${input.name}" already exists`);
    }

    const data: CreateDockerInput = {
      name: input.name,
      type: input.type ?? null,
      stopcommand: input.stopcommand ?? null,
      localport: input.localport ?? null,
      bindport: input.bindport ?? null,
      dockercompose: input.dockercompose ?? null,
      dockerlocation: input.dockerlocation ?? null,
      description: input.description ?? null,
      status: 'INACTIVE',
      pid: null,
    };

    return DockerRepository.create(data);
  }

  static listDockers(): Promise<DockerEntity[]> {
    return DockerRepository.findMany();
  }

  static async getDockerById(id: string): Promise<DockerEntity> {
    const docker = await DockerRepository.findById(id);
    return ensureDockerExists(docker, id);
  }

  static async updateDocker(id: string, input: UpdateDockerDto): Promise<DockerEntity> {
    await DockerService.getDockerById(id);

    const data: UpdateDockerInput = {};

    if (Object.prototype.hasOwnProperty.call(input, 'name') && input.name) {
      data.name = input.name;
    }
    if (Object.prototype.hasOwnProperty.call(input, 'type')) {
      data.type = input.type ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(input, 'stopcommand')) {
      data.stopcommand = input.stopcommand ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(input, 'localport')) {
      data.localport = input.localport ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(input, 'bindport')) {
      data.bindport = input.bindport ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(input, 'dockercompose')) {
      data.dockercompose = input.dockercompose ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(input, 'dockerlocation')) {
      data.dockerlocation = input.dockerlocation ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(input, 'description')) {
      data.description = input.description ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(input, 'status') && input.status) {
      data.status = input.status;
    }
    if (Object.prototype.hasOwnProperty.call(input, 'pid')) {
      data.pid = input.pid ?? null;
    }

    return DockerRepository.update(id, data);
  }

  static async deleteDocker(id: string): Promise<DockerEntity> {
    const docker = await DockerService.getDockerById(id);

    const running = await isContainerRunning(docker.name);
    if (running) {
      throw new HttpError(400, `Cannot delete docker "${docker.name}" while container is running`);
    }

    return DockerRepository.delete(id);
  }

  static async startDocker(id: string, options?: { build?: boolean }): Promise<DockerEntity> {
    const docker = await DockerService.getDockerById(id);
    if (!docker.dockerlocation && !docker.dockercompose) {
      throw new HttpError(400, 'Docker entry does not have docker-compose configuration');
    }

    await DockerRepository.update(docker.id, { status: 'PENDING' });

    const composeResult = await composeUp({
      composeFile: docker.dockercompose,
      workingDirectory: docker.dockerlocation,
      projectName: docker.name,
      build: options?.build ?? false,
    });

    if (composeResult.exitCode !== 0) {
      throw new HttpError(
        500,
        `Failed to start docker "${docker.name}": ${composeResult.stderr || composeResult.stdout}`,
      );
    }

    const started = await waitForContainerToStart(docker.name);
    if (!started) {
      throw new HttpError(
        500,
        `Container "${docker.name}" did not start. Ensure the compose file sets container_name to "${docker.name}"`,
      );
    }

    const pid = await getContainerPid(docker.name);

    return DockerRepository.update(docker.id, {
      status: 'ACTIVE',
      pid,
    });
  }

  static async stopDocker(id: string): Promise<DockerEntity> {
    const docker = await DockerService.getDockerById(id);
    if (!docker.stopcommand) {
      throw new HttpError(400, `Docker "${docker.name}" does not have a stop command configured`);
    }

    const running = await isContainerRunning(docker.name);
    if (!running) {
      await DockerRepository.update(docker.id, { status: 'INACTIVE', pid: null });
      return docker;
    }

    await DockerRepository.update(docker.id, { status: 'PENDING' });

    const sendResult = await sendCommandToContainer(docker.name, docker.stopcommand);
    if (sendResult.exitCode !== 0) {
      throw new HttpError(
        500,
        `Failed to send stop command to "${docker.name}": ${sendResult.stderr || sendResult.stdout}`,
      );
    }

    const stopped = await waitForContainerToStop(docker.name);
    if (!stopped) {
      throw new HttpError(500, `Container "${docker.name}" did not stop within the timeout window`);
    }

    const downResult = await composeDown({
      composeFile: docker.dockercompose,
      workingDirectory: docker.dockerlocation,
      projectName: docker.name,
    });

    if (downResult.exitCode !== 0) {
      throw new HttpError(
        500,
        `Failed to stop docker "${docker.name}": ${downResult.stderr || downResult.stdout}`,
      );
    }

    return DockerRepository.update(docker.id, { status: 'INACTIVE', pid: null });
  }

  static async restartDocker(id: string, options?: { build?: boolean }): Promise<DockerEntity> {
    await DockerService.stopDocker(id);
    return DockerService.startDocker(id, options);
  }

  static async updateStats(docker: DockerEntity): Promise<ContainerStats | null> {
    const stats = await getContainerStats(docker.name);
    if (!stats) return null;

    await DockerRepository.upsertMonitor(docker.id, {
      name: docker.name,
      cpu: stats.cpuPercent,
      ram: stats.memoryUsageMb,
      status: docker.status,
      description: `Usage ${stats.memoryUsageMb.toFixed(2)} MiB / ${stats.memoryLimitMb.toFixed(2)} MiB`,
    });

    return stats;
  }
}

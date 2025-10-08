import { composeDown, composeUp, getContainerPid, getContainerStats, isContainerRunning, sendCommandToContainer, waitForContainerToStart, waitForContainerToStop, stopContainer, ensureManagementScripts, } from '../utils/docker.js';
import { env } from '../config/env.js';
import { DockerRepository } from '../repositories/docker.repository.js';
import { HttpError } from '../utils/httpError.js';
const ensureDockerExists = (docker, identifier) => {
    if (!docker) {
        throw new HttpError(404, `Docker entry "${identifier}" not found`);
    }
    return docker;
};
export class DockerService {
    static async createDocker(input) {
        const existing = await DockerRepository.findByName(input.name);
        if (existing) {
            throw new HttpError(409, `Docker entry with name "${input.name}" already exists`);
        }
        const data = {
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
    static listDockers() {
        return DockerRepository.findMany();
    }
    static async getDockerById(id) {
        const docker = await DockerRepository.findById(id);
        return ensureDockerExists(docker, id);
    }
    static async updateDocker(id, input) {
        await DockerService.getDockerById(id);
        const data = {};
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
    static async deleteDocker(id) {
        const docker = await DockerService.getDockerById(id);
        const running = await isContainerRunning(docker.name);
        if (running) {
            throw new HttpError(400, `Cannot delete docker "${docker.name}" while container is running`);
        }
        return DockerRepository.delete(id);
    }
    static async startDocker(id, options) {
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
            throw new HttpError(500, `Failed to start docker "${docker.name}": ${composeResult.stderr || composeResult.stdout}`);
        }
        const started = await waitForContainerToStart(docker.name);
        if (!started) {
            throw new HttpError(500, `Container "${docker.name}" did not start. Ensure the compose file sets container_name to "${docker.name}"`);
        }
        try {
            await ensureManagementScripts(docker.name, docker.stopcommand ?? null);
        }
        catch (error) {
            throw new HttpError(500, `Failed to prepare management scripts for "${docker.name}": ${error.message}`);
        }
        const pid = await getContainerPid(docker.name);
        return DockerRepository.update(docker.id, {
            status: 'ACTIVE',
            pid,
        });
    }
    static async stopDocker(id) {
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
            throw new HttpError(500, `Failed to send stop command to "${docker.name}": ${sendResult.stderr || sendResult.stdout}`);
        }
        const gracefulStop = await waitForContainerToStop(docker.name);
        let stopped = gracefulStop;
        if (!gracefulStop) {
            const stopResult = await stopContainer(docker.name);
            if (stopResult.exitCode !== 0) {
                throw new HttpError(500, `Container "${docker.name}" did not respond to stop command and docker stop failed: ${stopResult.stderr || stopResult.stdout}`);
            }
            stopped = await waitForContainerToStop(docker.name, env.dockerStopTimeoutSec * 1000, 1_000);
        }
        if (!stopped) {
            throw new HttpError(500, `Container "${docker.name}" did not stop within the timeout window`);
        }
        const downResult = await composeDown({
            composeFile: docker.dockercompose,
            workingDirectory: docker.dockerlocation,
            projectName: docker.name,
        });
        if (downResult.exitCode !== 0) {
            throw new HttpError(500, `Failed to stop docker "${docker.name}": ${downResult.stderr || downResult.stdout}`);
        }
        return DockerRepository.update(docker.id, { status: 'INACTIVE', pid: null });
    }
    static async restartDocker(id, options) {
        await DockerService.stopDocker(id);
        return DockerService.startDocker(id, options);
    }
    static async updateStats(docker) {
        const stats = await getContainerStats(docker.name);
        if (!stats)
            return null;
        await DockerRepository.upsertMonitor(docker.id, {
            name: docker.name,
            cpu: stats.cpuPercent,
            ram: stats.memoryUsageMb,
            status: docker.status,
            description: `Usage ${stats.memoryUsageMb.toFixed(2)} MiB / ${stats.memoryLimitMb.toFixed(2)} MiB`,
        });
        return stats;
    }
    static async sendCommand(id, command) {
        const docker = await DockerService.getDockerById(id);
        const trimmed = command?.trim();
        if (!trimmed) {
            throw new HttpError(400, 'Command text is required');
        }
        const running = await isContainerRunning(docker.name);
        if (!running) {
            throw new HttpError(400, `Container "${docker.name}" is not running`);
        }
        const result = await sendCommandToContainer(docker.name, trimmed);
        if (result.exitCode !== 0) {
            throw new HttpError(500, `Command failed with exit code ${result.exitCode}: ${result.stderr || result.stdout}`);
        }
        return result;
    }
}
//# sourceMappingURL=docker.service.js.map
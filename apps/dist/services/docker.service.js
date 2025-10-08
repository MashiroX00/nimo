import { composeDown, composeUp, getContainerPid, getContainerStats, isContainerRunning, waitForContainerToStart, waitForContainerToStop, stopContainer, ensureManagementScripts, executeContainerScript, } from '../utils/docker.js';
import { env } from '../config/env.js';
import { DockerRepository } from '../repositories/docker.repository.js';
import { HttpError } from '../utils/httpError.js';
import { createLogger } from '../logger.js';
const ensureDockerExists = (docker, identifier) => {
    if (!docker) {
        throw new HttpError(404, `Docker entry "${identifier}" not found`);
    }
    return docker;
};
const log = createLogger('DockerService');
export class DockerService {
    static async createDocker(input) {
        const existing = await DockerRepository.findByName(input.name);
        if (existing) {
            throw new HttpError(409, `Docker entry with name "${input.name}" already exists`);
        }
        log.info('Creating docker entry', { name: input.name });
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
        const created = await DockerRepository.create(data);
        log.info('Docker entry created', { id: created.id, name: created.name });
        return created;
    }
    static listDockers() {
        log.debug('Listing docker entries');
        return DockerRepository.findMany();
    }
    static async getDockerById(id) {
        const docker = await DockerRepository.findById(id);
        return ensureDockerExists(docker, id);
    }
    static async updateDocker(id, input) {
        await DockerService.getDockerById(id);
        const data = {};
        log.info('Updating docker entry', { id, fields: Object.keys(input) });
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
        const updated = await DockerRepository.update(id, data);
        log.info('Docker entry updated', { id });
        return updated;
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
        log.info('Starting docker', { id, name: docker.name, build: Boolean(options?.build) });
        await DockerRepository.update(docker.id, { status: 'PENDING' });
        log.debug('Invoking docker compose up', {
            name: docker.name,
            compose: docker.dockercompose,
            location: docker.dockerlocation,
        });
        const composeResult = await composeUp({
            composeFile: docker.dockercompose,
            workingDirectory: docker.dockerlocation,
            projectName: docker.name,
            build: options?.build ?? false,
        });
        if (composeResult.exitCode !== 0) {
            log.error('docker compose up failed', {
                name: docker.name,
                exitCode: composeResult.exitCode,
                stderr: composeResult.stderr,
                stdout: composeResult.stdout,
            });
            throw new HttpError(500, `Failed to start docker "${docker.name}": ${composeResult.stderr || composeResult.stdout}`);
        }
        const started = await waitForContainerToStart(docker.name);
        if (!started) {
            throw new HttpError(500, `Container "${docker.name}" did not start. Ensure the compose file sets container_name to "${docker.name}"`);
        }
        try {
            await ensureManagementScripts(docker.name, docker.stopcommand ?? null);
            log.debug('Prepared management scripts', { name: docker.name });
        }
        catch (error) {
            log.error('Failed to prepare management scripts', {
                name: docker.name,
                error: error.message,
            });
            throw new HttpError(500, `Failed to prepare management scripts for "${docker.name}": ${error.message}`);
        }
        const pid = await getContainerPid(docker.name);
        const updated = await DockerRepository.update(docker.id, {
            status: 'ACTIVE',
            pid,
        });
        log.info('Docker started', { id, name: docker.name, pid });
        return updated;
    }
    static async stopDocker(id) {
        const docker = await DockerService.getDockerById(id);
        const running = await isContainerRunning(docker.name);
        if (!running) {
            await DockerRepository.update(docker.id, { status: 'INACTIVE', pid: null });
            return docker;
        }
        await DockerRepository.update(docker.id, { status: 'PENDING' });
        let gracefulStop = false;
        try {
            const scriptResult = await executeContainerScript(docker.name, 'stop.sh');
            if (scriptResult.exitCode !== 0) {
                log.warn('stop.sh returned non-zero exit code', {
                    name: docker.name,
                    exitCode: scriptResult.exitCode,
                    stderr: scriptResult.stderr,
                    stdout: scriptResult.stdout,
                });
            }
            else {
                gracefulStop = await waitForContainerToStop(docker.name);
            }
        }
        catch (error) {
            log.warn('stop.sh execution failed', { name: docker.name, error: error.message });
        }
        let stopped = gracefulStop;
        if (!gracefulStop) {
            log.warn('Falling back to docker stop', { name: docker.name });
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
        const updated = await DockerRepository.update(docker.id, { status: 'INACTIVE', pid: null });
        log.info('Docker stopped', { id, name: docker.name });
        return updated;
    }
    static async restartDocker(id, options) {
        log.info('Restarting docker', { id });
        await DockerService.stopDocker(id);
        return DockerService.startDocker(id, options);
    }
    static async updateStats(docker) {
        log.debug('Collecting docker stats', { name: docker.name });
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
        const running = await isContainerRunning(docker.name);
        if (!running) {
            throw new HttpError(400, `Container "${docker.name}" is not running`);
        }
        log.info('Executing command script', { id, name: docker.name });
        const result = await executeContainerScript(docker.name, 'command.sh', command?.trim());
        if (result.exitCode !== 0) {
            throw new HttpError(500, `Command script failed with exit code ${result.exitCode}: ${result.stderr || result.stdout}`);
        }
        return result;
    }
}
//# sourceMappingURL=docker.service.js.map
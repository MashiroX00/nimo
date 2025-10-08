import { DockerService } from '../services/docker.service.js';
import { DockerRepository } from '../repositories/docker.repository.js';
import { HttpError } from '../utils/httpError.js';
const getDockerId = (req) => {
    const id = req.params?.id;
    if (!id) {
        throw new HttpError(400, 'Docker id is required');
    }
    return id;
};
export class DockerController {
    static async list(_req, res) {
        const dockers = await DockerService.listDockers();
        res.json(dockers);
    }
    static async create(req, res) {
        const docker = await DockerService.createDocker(req.body);
        res.status(201).json(docker);
    }
    static async detail(req, res) {
        const docker = await DockerService.getDockerById(getDockerId(req));
        res.json(docker);
    }
    static async update(req, res) {
        const docker = await DockerService.updateDocker(getDockerId(req), req.body);
        res.json(docker);
    }
    static async remove(req, res) {
        const docker = await DockerService.deleteDocker(getDockerId(req));
        res.json(docker);
    }
    static async start(req, res) {
        const docker = await DockerService.startDocker(getDockerId(req), {
            build: Boolean(req.body?.build),
        });
        res.json(docker);
    }
    static async stop(req, res) {
        const docker = await DockerService.stopDocker(getDockerId(req));
        res.json(docker);
    }
    static async restart(req, res) {
        const docker = await DockerService.restartDocker(getDockerId(req), {
            build: Boolean(req.body?.build),
        });
        res.json(docker);
    }
    static async stats(req, res) {
        const id = getDockerId(req);
        await DockerService.getDockerById(id);
        const monitor = await DockerRepository.findMonitorByDockerId(id);
        res.json(monitor);
    }
    static async command(req, res) {
        const id = getDockerId(req);
        const { command } = req.body ?? {};
        if (typeof command !== 'string' || command.trim().length === 0) {
            throw new HttpError(400, 'Command text is required');
        }
        const result = await DockerService.sendCommand(id, command);
        res.json({
            exitCode: result.exitCode,
            stdout: result.stdout,
            stderr: result.stderr,
        });
    }
}
//# sourceMappingURL=docker.controller.js.map
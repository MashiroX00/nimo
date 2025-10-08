import type { Request, Response } from 'express';
import { DockerService } from '../services/docker.service.js';
import { DockerRepository } from '../repositories/docker.repository.js';
import { HttpError } from '../utils/httpError.js';

const getDockerId = (req: Request): string => {
  const id = req.params?.id;
  if (!id) {
    throw new HttpError(400, 'Docker id is required');
  }
  return id;
};

export class DockerController {
  static async list(_req: Request, res: Response) {
    const dockers = await DockerService.listDockers();
    res.json(dockers);
  }

  static async create(req: Request, res: Response) {
    const docker = await DockerService.createDocker(req.body);
    res.status(201).json(docker);
  }

  static async detail(req: Request, res: Response) {
    const docker = await DockerService.getDockerById(getDockerId(req));
    res.json(docker);
  }

  static async update(req: Request, res: Response) {
    const docker = await DockerService.updateDocker(getDockerId(req), req.body);
    res.json(docker);
  }

  static async remove(req: Request, res: Response) {
    const docker = await DockerService.deleteDocker(getDockerId(req));
    res.json(docker);
  }

  static async start(req: Request, res: Response) {
    const docker = await DockerService.startDocker(getDockerId(req), {
      build: Boolean(req.body?.build),
    });
    res.json(docker);
  }

  static async stop(req: Request, res: Response) {
    const docker = await DockerService.stopDocker(getDockerId(req));
    res.json(docker);
  }

  static async restart(req: Request, res: Response) {
    const docker = await DockerService.restartDocker(getDockerId(req), {
      build: Boolean(req.body?.build),
    });
    res.json(docker);
  }

  static async stats(req: Request, res: Response) {
    const id = getDockerId(req);
    await DockerService.getDockerById(id);
    const monitor = await DockerRepository.findMonitorByDockerId(id);
    res.json(monitor);
  }

  static async command(req: Request, res: Response) {
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

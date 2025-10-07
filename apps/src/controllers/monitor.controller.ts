import type { Request, Response } from 'express';
import { DockerRepository } from '../repositories/docker.repository.js';

export class MonitorController {
  static async list(_req: Request, res: Response) {
    const monitors = await DockerRepository.listMonitors();
    res.json(monitors);
  }
}


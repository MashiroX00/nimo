import { DockerRepository } from '../repositories/docker.repository.js';
export class MonitorController {
    static async list(_req, res) {
        const monitors = await DockerRepository.listMonitors();
        res.json(monitors);
    }
}
//# sourceMappingURL=monitor.controller.js.map
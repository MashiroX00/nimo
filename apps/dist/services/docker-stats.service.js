import { env } from '../config/env.js';
import { DockerRepository } from '../repositories/docker.repository.js';
import { DockerService } from './docker.service.js';
export class DockerStatsService {
    timer;
    running = false;
    start() {
        if (this.timer)
            return;
        this.running = true;
        this.timer = setInterval(() => {
            this.collect().catch((error) => {
                console.error('[DockerStatsService] collect error', error);
            });
        }, env.pollingIntervalMs);
        void this.collect();
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
        this.running = false;
    }
    async collect() {
        if (!this.running)
            return;
        const dockers = await DockerRepository.findActive();
        await Promise.all(dockers.map(async (docker) => {
            try {
                await DockerService.updateStats(docker);
            }
            catch (error) {
                console.warn(`[DockerStatsService] Failed to update stats for ${docker.name}`, error);
            }
        }));
    }
}
export const dockerStatsService = new DockerStatsService();
//# sourceMappingURL=docker-stats.service.js.map
import { env } from '../config/env.js';
import { DockerRepository } from '../repositories/docker.repository.js';
import { DockerService } from './docker.service.js';
import { createLogger } from '../logger.js';

const log = createLogger('DockerStatsService');

export class DockerStatsService {
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  start() {
    if (this.timer) return;
    this.running = true;
    log.info('Starting docker stats polling', { intervalMs: env.pollingIntervalMs });
    this.timer = setInterval(() => {
      this.collect().catch((error) => {
        log.error('Collect cycle failed', { error: (error as Error).message });
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
    log.info('Stopped docker stats polling');
  }

  async collect(): Promise<void> {
    if (!this.running) return;

    const dockers = await DockerRepository.findActive();
    log.debug('Collecting stats for active dockers', { count: dockers.length });
    await Promise.all(
      dockers.map(async (docker) => {
        try {
          await DockerService.updateStats(docker);
        } catch (error) {
          log.warn('Failed to update docker stats', {
            name: docker.name,
            error: (error as Error).message,
          });
        }
      }),
    );
  }
}

export const dockerStatsService = new DockerStatsService();

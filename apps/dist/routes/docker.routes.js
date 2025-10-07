import { Router } from 'express';
import { DockerController } from '../controllers/docker.controller.js';
const router = Router();
router.get('/', DockerController.list);
router.post('/', DockerController.create);
router.get('/:id', DockerController.detail);
router.put('/:id', DockerController.update);
router.delete('/:id', DockerController.remove);
router.post('/:id/start', DockerController.start);
router.post('/:id/stop', DockerController.stop);
router.post('/:id/restart', DockerController.restart);
router.get('/:id/stats', DockerController.stats);
export const dockerRouter = router;
//# sourceMappingURL=docker.routes.js.map
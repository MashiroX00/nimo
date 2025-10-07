import { Router } from 'express';
import { dockerRouter } from './docker.routes.js';
import { MonitorController } from '../controllers/monitor.controller.js';
const router = Router();
router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
router.get('/monitors', MonitorController.list);
router.use('/dockers', dockerRouter);
export const apiRouter = router;
//# sourceMappingURL=index.js.map
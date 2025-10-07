import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { apiRouter } from './routes/index.js';
import { notFoundHandler } from './middlewares/not-found.js';
import { errorHandler } from './middlewares/error-handler.js';
import { swaggerSpec } from './docs/swagger.js';
import { env, isProduction } from './config/env.js';
export const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(isProduction ? 'combined' : 'dev'));
app.get('/', (_req, res) => {
    res.json({
        name: 'Docker Management API',
        version: '1.0.0',
        docs: '/docs',
        health: '/api/health',
    });
});
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/docs-json', (_req, res) => {
    res.json(swaggerSpec);
});
app.use('/api', apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);
//# sourceMappingURL=app.js.map
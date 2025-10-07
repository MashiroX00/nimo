import { HttpError } from '../utils/httpError.js';
export const errorHandler = (error, _req, res, _next) => {
    if (error instanceof HttpError) {
        res.status(error.statusCode).json({
            message: error.message,
            details: error.details,
        });
        return;
    }
    console.error('[UnhandledError]', error);
    res.status(500).json({
        message: 'Unexpected server error',
    });
};
//# sourceMappingURL=error-handler.js.map
import type { ErrorRequestHandler } from 'express';
import { HttpError } from '../utils/httpError.js';
import { createLogger } from '../logger.js';

const log = createLogger('ErrorHandler');

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      message: error.message,
      details: error.details,
    });
    return;
  }

  log.error('Unhandled error', {
    error: (error as Error).message,
    stack: (error as Error).stack,
  });
  res.status(500).json({
    message: 'Unexpected server error',
  });
};

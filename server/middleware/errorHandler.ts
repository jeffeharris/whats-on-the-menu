import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from '../logger.js';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  /** Extra fields merged into the structured log line by errorHandler. */
  context?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode = 500,
    isOperational = true,
    cause?: unknown,
    context?: Record<string, unknown>,
  ) {
    super(message, cause === undefined ? undefined : { cause });
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Wraps an async route handler so rejections are forwarded to the error
 * middleware via next(err) instead of becoming unhandled rejections.
 *
 * When `fallbackMessage` is provided, any rejection that is not already an
 * AppError is wrapped in `new AppError(fallbackMessage, 500)` with the
 * original error preserved as its `cause` — this keeps each endpoint's
 * user-facing error string (previously hardcoded in per-route catch blocks)
 * while letting the shared errorHandler own the response and logging.
 *
 * `getContext` supplies extra fields for the structured log line, for handlers
 * whose per-route catch block used to log request-specific context alongside
 * the error.
 */
export function asyncHandler(
  fn: AsyncRequestHandler,
  fallbackMessage?: string,
  getContext?: (req: Request) => Record<string, unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch((err: unknown) => {
      const context = getContext?.(req);
      if (fallbackMessage !== undefined && !(err instanceof AppError)) {
        next(new AppError(fallbackMessage, 500, true, err, context));
      } else {
        if (context && err instanceof AppError && err.context === undefined) {
          err.context = context;
        }
        next(err);
      }
    });
  };
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'Not found' });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    // Log the underlying cause when one was attached (asyncHandler wrapping),
    // so the original failure isn't hidden behind the user-facing message.
    logger.error({ ...err.context, err: err.cause ?? err, statusCode: err.statusCode }, err.message);
    return res.status(err.statusCode).json({ error: err.message });
  }

  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
}

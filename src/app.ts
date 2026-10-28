import express from 'express';
import type { DB } from './db/connection';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { createRouter } from './routes';

export function createApp(db: DB) {
  const app = express();

  app.use(express.json());
  app.use(createRouter(db));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

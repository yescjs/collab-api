import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import prisma from './config/database';
import { sendSuccess } from './utils/response';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Health check
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    sendSuccess(res, { status: 'ok', db: 'connected' });
  } catch {
    res.status(503).json({ success: false, error: { code: 'DB_ERROR', message: 'Database unreachable' } });
  }
});

// Routes will be added in later tasks

// Error handler (must be last)
app.use(errorHandler);

export default app;

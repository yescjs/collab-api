import { Router, Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { authenticate } from '../middleware/auth';
import { sendSuccess } from '../utils/response';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      throw new AppError(400, 'VALIDATION_ERROR', 'email, password, and name are required');
    }
    const result = await authService.register({ email, password, name });
    sendSuccess(res, result, 201);
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new AppError(400, 'VALIDATION_ERROR', 'email and password are required');
    }
    const result = await authService.login({ email, password });
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new AppError(400, 'VALIDATION_ERROR', 'refreshToken is required');
    }
    const result = await authService.refresh(refreshToken);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getMe(req.user!.userId);
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
});

export default router;

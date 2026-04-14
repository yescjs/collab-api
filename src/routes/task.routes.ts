import { Router, Request, Response, NextFunction } from 'express';
import * as taskService from '../services/task.service';
import { authenticate } from '../middleware/auth';
import { requireProjectMember } from '../middleware/rbac';
import { sendSuccess, sendPaginated } from '../utils/response';
import { parsePagination } from '../utils/pagination';
import { AppError } from '../middleware/errorHandler';
import { TaskStatus, Priority } from '@prisma/client';

const router = Router();

router.use(authenticate);

// POST /api/projects/:pid/tasks
router.post(
  '/projects/:pid/tasks',
  requireProjectMember(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, description, priority, assigneeId, dueDate } = req.body;
      if (!title) throw new AppError(400, 'VALIDATION_ERROR', 'title is required');
      const task = await taskService.create({
        title,
        description,
        priority,
        assigneeId,
        projectId: req.params.pid as string,
        dueDate,
      });
      sendSuccess(res, task, 201);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/projects/:pid/tasks
router.get(
  '/projects/:pid/tasks',
  requireProjectMember(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pagination = parsePagination(req.query as { page?: string; limit?: string });
      const filters = {
        status: req.query.status as TaskStatus | undefined,
        priority: req.query.priority as Priority | undefined,
        assigneeId: req.query.assigneeId as string | undefined,
        sort: req.query.sort as string | undefined,
        order: req.query.order as 'asc' | 'desc' | undefined,
      };
      const { tasks, total } = await taskService.findAll(req.params.pid as string, pagination, filters);
      sendPaginated(res, tasks, { page: pagination.page, limit: pagination.limit, total });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/tasks/:id
router.get('/tasks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await taskService.findById(req.params.id as string);
    sendSuccess(res, task);
  } catch (err) {
    next(err);
  }
});

// PUT /api/tasks/:id
router.put('/tasks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, priority, assigneeId, dueDate } = req.body;
    const task = await taskService.update(req.params.id as string, {
      title,
      description,
      priority,
      assigneeId,
      dueDate,
    });
    sendSuccess(res, task);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tasks/:id/status
router.patch('/tasks/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    if (!status || !['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'].includes(status)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Valid status is required (TODO, IN_PROGRESS, REVIEW, DONE)');
    }
    const { task, oldStatus } = await taskService.updateStatus(req.params.id as string, status);

    // WebSocket broadcast
    const io = req.app.get('io');
    if (io) {
      io.to(`project:${task.projectId}`).emit('task-status-changed', {
        taskId: task.id,
        oldStatus,
        newStatus: task.status,
        changedBy: req.user!.userId,
        timestamp: new Date().toISOString(),
      });
    }

    sendSuccess(res, task);
  } catch (err) {
    next(err);
  }
});

export default router;

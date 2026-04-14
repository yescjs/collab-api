import { Router, Request, Response, NextFunction } from 'express';
import * as projectService from '../services/project.service';
import { authenticate } from '../middleware/auth';
import { requireRole, requireProjectRole, requireProjectMember } from '../middleware/rbac';
import { sendSuccess, sendPaginated } from '../utils/response';
import { parsePagination } from '../utils/pagination';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

// POST /api/projects
router.post(
  '/',
  requireRole('ADMIN', 'MANAGER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description } = req.body;
      if (!name) throw new AppError(400, 'VALIDATION_ERROR', 'name is required');
      const project = await projectService.create({
        name,
        description,
        userId: req.user!.userId,
      });
      sendSuccess(res, project, 201);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/projects
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = parsePagination(req.query as { page?: string; limit?: string });
    const { projects, total } = await projectService.findAll(req.user!.userId, pagination);
    sendPaginated(res, projects, { page: pagination.page, limit: pagination.limit, total });
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id
router.get(
  '/:id',
  requireProjectMember(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await projectService.findById(req.params.id as string);
      sendSuccess(res, project);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/projects/:id
router.put(
  '/:id',
  requireProjectRole('OWNER', 'MANAGER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description } = req.body;
      const project = await projectService.update(req.params.id as string, { name, description });
      sendSuccess(res, project);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/projects/:id
router.delete(
  '/:id',
  requireProjectRole('OWNER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await projectService.softDelete(req.params.id as string);
      sendSuccess(res, { message: 'Project deleted' });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/projects/:id/members
router.post(
  '/:id/members',
  requireProjectRole('OWNER', 'MANAGER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, role } = req.body;
      if (!email) throw new AppError(400, 'VALIDATION_ERROR', 'email is required');
      const member = await projectService.addMember(req.params.id as string, email, role);
      sendSuccess(res, member, 201);
    } catch (err) {
      next(err);
    }
  },
);

export default router;

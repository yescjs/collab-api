import { Request, Response, NextFunction } from 'express';
import { Role, ProjectRole } from '@prisma/client';
import { AppError } from './errorHandler';
import prisma from '../config/database';

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }
    if (!roles.includes(req.user.role)) {
      throw new AppError(403, 'FORBIDDEN', 'Insufficient permissions');
    }
    next();
  };
}

export function requireProjectRole(...roles: ProjectRole[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const projectId = req.params.id || req.params.pid;
    if (!projectId) {
      throw new AppError(400, 'BAD_REQUEST', 'Project ID is required');
    }

    if (req.user.role === 'ADMIN') {
      next();
      return;
    }

    const member = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: req.user.userId, projectId } },
    });

    if (!member) {
      throw new AppError(403, 'FORBIDDEN', 'Not a member of this project');
    }

    if (!roles.includes(member.role)) {
      throw new AppError(403, 'FORBIDDEN', 'Insufficient project permissions');
    }

    next();
  };
}

export function requireProjectMember() {
  return requireProjectRole('OWNER', 'MANAGER', 'MEMBER');
}

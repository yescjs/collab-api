import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { PaginationParams, toPrismaArgs } from '../utils/pagination';

interface CreateProjectInput {
  name: string;
  description?: string;
  userId: string;
}

interface UpdateProjectInput {
  name?: string;
  description?: string;
}

export async function create(input: CreateProjectInput) {
  const project = await prisma.project.create({
    data: {
      name: input.name,
      description: input.description,
      members: {
        create: {
          userId: input.userId,
          role: 'OWNER',
        },
      },
    },
    include: { members: { include: { user: { select: { id: true, email: true, name: true } } } } },
  });
  return project;
}

export async function findAll(userId: string, pagination: PaginationParams) {
  const where = {
    deletedAt: null,
    members: { some: { userId } },
  };

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      ...toPrismaArgs(pagination),
      orderBy: { createdAt: 'desc' },
      include: {
        members: {
          include: { user: { select: { id: true, email: true, name: true } } },
        },
        _count: { select: { tasks: true } },
      },
    }),
    prisma.project.count({ where }),
  ]);

  return { projects, total };
}

export async function findById(projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: {
      members: {
        include: { user: { select: { id: true, email: true, name: true } } },
      },
      _count: { select: { tasks: true } },
    },
  });
  if (!project) {
    throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found');
  }
  return project;
}

export async function update(projectId: string, input: UpdateProjectInput) {
  const project = await prisma.project.update({
    where: { id: projectId },
    data: input,
    include: {
      members: {
        include: { user: { select: { id: true, email: true, name: true } } },
      },
    },
  });
  return project;
}

export async function softDelete(projectId: string) {
  await prisma.project.update({
    where: { id: projectId },
    data: { deletedAt: new Date() },
  });
}

export async function addMember(projectId: string, email: string, role: 'MANAGER' | 'MEMBER' = 'MEMBER') {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User with this email not found');
  }

  const existing = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: user.id, projectId } },
  });
  if (existing) {
    throw new AppError(409, 'ALREADY_MEMBER', 'User is already a member of this project');
  }

  const member = await prisma.projectMember.create({
    data: { userId: user.id, projectId, role },
    include: { user: { select: { id: true, email: true, name: true } } },
  });
  return member;
}

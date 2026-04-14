import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { PaginationParams, toPrismaArgs } from '../utils/pagination';
import { TaskStatus, Priority, Prisma } from '@prisma/client';

interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: Priority;
  assigneeId?: string;
  projectId: string;
  dueDate?: string;
}

interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: Priority;
  assigneeId?: string | null;
  dueDate?: string | null;
}

interface TaskFilterParams {
  status?: TaskStatus;
  priority?: Priority;
  assigneeId?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export async function create(input: CreateTaskInput) {
  const task = await prisma.task.create({
    data: {
      title: input.title,
      description: input.description,
      priority: input.priority || 'MEDIUM',
      assigneeId: input.assigneeId,
      projectId: input.projectId,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    },
    include: {
      assignee: { select: { id: true, email: true, name: true } },
    },
  });
  return task;
}

export async function findAll(
  projectId: string,
  pagination: PaginationParams,
  filters: TaskFilterParams,
) {
  const where: Prisma.TaskWhereInput = { projectId };
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.assigneeId) where.assigneeId = filters.assigneeId;

  const sortField = filters.sort === 'dueDate' ? 'dueDate' : 'createdAt';
  const sortOrder = filters.order === 'asc' ? 'asc' : 'desc';

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      ...toPrismaArgs(pagination),
      orderBy: { [sortField]: sortOrder },
      include: {
        assignee: { select: { id: true, email: true, name: true } },
      },
    }),
    prisma.task.count({ where }),
  ]);

  return { tasks, total };
}

export async function findById(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: { select: { id: true, email: true, name: true } },
      project: { select: { id: true, name: true } },
    },
  });
  if (!task) {
    throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');
  }
  return task;
}

export async function update(taskId: string, input: UpdateTaskInput) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...input,
      dueDate: input.dueDate === null ? null : input.dueDate ? new Date(input.dueDate) : undefined,
    },
    include: {
      assignee: { select: { id: true, email: true, name: true } },
    },
  });
  return task;
}

export async function updateStatus(taskId: string, status: TaskStatus) {
  const oldTask = await prisma.task.findUnique({ where: { id: taskId } });
  if (!oldTask) {
    throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: { status },
    include: {
      assignee: { select: { id: true, email: true, name: true } },
    },
  });

  return { task, oldStatus: oldTask.status };
}

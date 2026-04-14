import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/database';

describe('Task API', () => {
  let accessToken: string;
  let projectId: string;
  let taskId: string;

  beforeAll(async () => {
    // Register user
    await request(app).post('/api/auth/register').send({
      email: 'tasktest@test.com',
      password: 'password123',
      name: 'Task Test User',
    });

    // Upgrade to MANAGER for project creation
    await prisma.user.updateMany({
      where: { email: 'tasktest@test.com' },
      data: { role: 'MANAGER' },
    });

    // Login with fresh token (role updated)
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tasktest@test.com', password: 'password123' });
    accessToken = loginRes.body.data.accessToken;

    // Create project
    const projectRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Test Project' });
    projectId = projectRes.body.data.id;
  });

  describe('POST /api/projects/:pid/tasks', () => {
    it('should create a task', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Test Task', priority: 'HIGH' });
      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Test Task');
      expect(res.body.data.status).toBe('TODO');
      taskId = res.body.data.id;
    });
  });

  describe('GET /api/projects/:pid/tasks', () => {
    it('should list tasks with pagination', async () => {
      const res = await request(app)
        .get(`/api/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.total).toBeGreaterThan(0);
    });

    it('should filter by status', async () => {
      const res = await request(app)
        .get(`/api/projects/${projectId}/tasks?status=TODO`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      res.body.data.forEach((task: { status: string }) => {
        expect(task.status).toBe('TODO');
      });
    });
  });

  describe('PATCH /api/tasks/:id/status', () => {
    it('should change task status', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'IN_PROGRESS' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('IN_PROGRESS');
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('should get task detail', async () => {
      const res = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(taskId);
      expect(res.body.data.project).toBeDefined();
    });
  });
});

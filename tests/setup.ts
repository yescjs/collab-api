import 'dotenv/config';
import { beforeAll, afterAll } from 'vitest';
import prisma from '../src/config/database';

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  // Clean test data in correct order (foreign key constraints)
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

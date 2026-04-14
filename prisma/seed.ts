import 'dotenv/config';
import { PrismaClient, Role, ProjectRole, TaskStatus, Priority } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: { email: 'admin@collab.com', password: hashedPassword, name: 'Admin User', role: Role.ADMIN },
  });
  const manager = await prisma.user.create({
    data: { email: 'manager@collab.com', password: hashedPassword, name: 'Manager User', role: Role.MANAGER },
  });
  const member = await prisma.user.create({
    data: { email: 'member@collab.com', password: hashedPassword, name: 'Member User', role: Role.MEMBER },
  });

  const project1 = await prisma.project.create({
    data: {
      name: 'Sprint Alpha',
      description: 'First sprint project',
      members: {
        create: [
          { userId: manager.id, role: ProjectRole.OWNER },
          { userId: member.id, role: ProjectRole.MEMBER },
          { userId: admin.id, role: ProjectRole.MANAGER },
        ],
      },
    },
  });
  const project2 = await prisma.project.create({
    data: {
      name: 'Sprint Beta',
      description: 'Second sprint project',
      members: {
        create: [
          { userId: admin.id, role: ProjectRole.OWNER },
          { userId: manager.id, role: ProjectRole.MEMBER },
        ],
      },
    },
  });

  const statuses = [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW, TaskStatus.DONE];
  const priorities = [Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.URGENT];

  for (let i = 1; i <= 7; i++) {
    await prisma.task.create({
      data: {
        title: `Task Alpha-${i}`,
        description: `Description for task ${i}`,
        status: statuses[i % 4],
        priority: priorities[i % 4],
        assigneeId: i % 2 === 0 ? member.id : manager.id,
        projectId: project1.id,
        dueDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
      },
    });
  }

  for (let i = 1; i <= 3; i++) {
    await prisma.task.create({
      data: {
        title: `Task Beta-${i}`,
        description: `Description for task beta ${i}`,
        status: statuses[i % 4],
        priority: priorities[(i + 1) % 4],
        assigneeId: manager.id,
        projectId: project2.id,
      },
    });
  }

  console.log('Seed data created successfully');
  console.log(`  Users: ${admin.email}, ${manager.email}, ${member.email}`);
  console.log(`  Projects: ${project1.name}, ${project2.name}`);
  console.log(`  Tasks: 10 total`);
  console.log(`  Password for all: password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

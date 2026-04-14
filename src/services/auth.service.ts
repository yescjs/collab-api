import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { Role } from '@prisma/client';

interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface TokenPayload {
  userId: string;
  role: Role;
}

function generateTokens(payload: TokenPayload) {
  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as unknown as number,
  });
  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as unknown as number,
  });
  return { accessToken, refreshToken };
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError(409, 'EMAIL_EXISTS', 'Email already registered');
  }

  const hashedPassword = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      password: hashedPassword,
      name: input.name,
    },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  const tokens = generateTokens({ userId: user.id, role: user.role });
  return { user, ...tokens };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const isValid = await bcrypt.compare(input.password, user.password);
  if (!isValid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const tokens = generateTokens({ userId: user.id, role: user.role });
  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, ...tokens };
}

export async function refresh(refreshToken: string) {
  try {
    const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as TokenPayload;
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      throw new AppError(401, 'INVALID_TOKEN', 'User not found');
    }
    const tokens = generateTokens({ userId: user.id, role: user.role });
    return tokens;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(401, 'INVALID_TOKEN', 'Invalid or expired refresh token');
  }
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }
  return user;
}

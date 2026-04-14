import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthUser } from '../middleware/auth';

export function setupSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // JWT authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as AuthUser;
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (user: ${socket.data.user.userId})`);

    socket.on('join-project', ({ projectId }: { projectId: string }) => {
      socket.join(`project:${projectId}`);
      console.log(`User ${socket.data.user.userId} joined project:${projectId}`);
    });

    socket.on('leave-project', ({ projectId }: { projectId: string }) => {
      socket.leave(`project:${projectId}`);
      console.log(`User ${socket.data.user.userId} left project:${projectId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

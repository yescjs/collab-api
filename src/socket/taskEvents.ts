import { Server } from 'socket.io';

export function emitTaskStatusChanged(
  io: Server,
  projectId: string,
  data: {
    taskId: string;
    oldStatus: string;
    newStatus: string;
    changedBy: string;
    timestamp: string;
  },
) {
  io.to(`project:${projectId}`).emit('task-status-changed', data);
}

export function emitTaskAssigned(
  io: Server,
  projectId: string,
  data: {
    taskId: string;
    assigneeId: string;
    assignedBy: string;
    timestamp: string;
  },
) {
  io.to(`project:${projectId}`).emit('task-assigned', data);
}

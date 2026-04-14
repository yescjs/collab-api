import 'dotenv/config';
import { env } from './config/env';
import app from './app';
import { createServer } from 'http';
import { setupSocket } from './socket';

const httpServer = createServer(app);
const io = setupSocket(httpServer);

// Make io accessible from Express routes
app.set('io', io);

httpServer.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  console.log(`WebSocket server ready`);
});

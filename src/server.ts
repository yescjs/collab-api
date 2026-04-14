import 'dotenv/config';
import { env } from './config/env';
import app from './app';
import { createServer } from 'http';

const httpServer = createServer(app);

httpServer.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

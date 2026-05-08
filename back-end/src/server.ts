import { app } from './app.js';
import { env } from './env/index.js';

app
  .listen({
    host: env.HOST,
    port: env.PORT,
  })
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });

import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Allows `prisma generate` during local setup before `.env` exists.
    url: process.env.DATABASE_URL ?? 'postgresql://docker:docker@localhost:5436/forklift_db?schema=public',
  },
});

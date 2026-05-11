import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().default(3131),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  JWT_EXPIRES_IN: z.string().default('7d'),
  FIRST_PASSWORD: z.string().min(1),
  URL_VERIFY_EMPLOYEES: z.string().min(1),
  APPNAME: z.string().default('ForkLift'),
  APPKEY: z.string().default('forklift-api-key'),
  /** Pasta de uploads (relativa ao cwd ou caminho absoluto). Montada em Docker em /usr/src/app/uploads */
  UPLOAD_DIR: z.string().default('uploads'),
});

export const env = envSchema.parse(process.env);

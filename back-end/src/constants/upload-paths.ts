import path from 'path'
import { env } from '../env/index.js'

export const UPLOAD_ROOT_ABSOLUTE = path.isAbsolute(env.UPLOAD_DIR)
  ? env.UPLOAD_DIR
  : path.resolve(process.cwd(), env.UPLOAD_DIR)

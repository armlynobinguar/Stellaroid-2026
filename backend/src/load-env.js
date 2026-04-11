/**
 * Must be imported before any module that reads process.env from .env
 * (ESM evaluates static imports before the rest of server.js runs).
 */
import { config as loadEnv } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: join(__dirname, '..', '.env') })

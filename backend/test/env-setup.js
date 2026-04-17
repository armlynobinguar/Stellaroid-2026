/**
 * Ensures required env exists before `app.js` loads (CI has no backend/.env).
 * Real values in .env are applied by dotenv and do not override existing keys.
 */
if (!String(process.env.CONTRACT_ID ?? '').trim()) {
  process.env.CONTRACT_ID =
    'CABXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
}
if (!String(process.env.BACKEND_SECRET ?? '').trim()) {
  process.env.BACKEND_SECRET = `S${'D'.repeat(55)}`
}

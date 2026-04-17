import app from './app.js'

const PORT = process.env.PORT || 4000

app.listen(PORT, () => {
  console.log(`
  ✦ Stellaroid Earn API
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Server  →  http://localhost:${PORT}
  Health  →  http://localhost:${PORT}/health
  Network →  ${process.env.NETWORK_PASSPHRASE || 'testnet'}
  Contract→  ${process.env.CONTRACT_ID}
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `)
})

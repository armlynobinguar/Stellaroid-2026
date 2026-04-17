import './env-setup.js'
import assert from 'node:assert/strict'
import { describe, it, before } from 'node:test'
import request from 'supertest'

let app

before(async () => {
  process.env.NODE_ENV = 'test'
  ;({ default: app } = await import('../src/app.js'))
})

describe('GET /health', () => {
  it('returns ok and expected shape', async () => {
    const res = await request(app).get('/health').expect(200)
    assert.equal(res.body.status, 'ok')
    assert.match(res.body.contract, /^CAB/)
    assert.ok(res.body.timestamp)
    assert.ok(res.body.network)
  })
})

describe('404', () => {
  it('returns JSON for unknown paths', async () => {
    const res = await request(app).get('/api/no-such-route').expect(404)
    assert.equal(res.body.error, 'Not found')
  })
})

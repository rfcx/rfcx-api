// Route-level: /images/:bucket/* enforces the hidden-cover gate BEFORE any storage read, and sets the
// right Cache-Control for public vs signed-private responses (rfcx-local 2026-09-25).
const express = require('express')
const request = require('supertest')

const storageCalls = []
jest.mock('../_services/storage', () => ({
  buckets: { mediaCacheImage: 'cache' },
  getObjectStreamOrNull: jest.fn(async (bucket, key) => { storageCalls.push([bucket, key]); return null }),
  uploadBuffer: jest.fn(async () => {})
}))

const HIDDEN = 'projects/1134899/project-profile-image-953566d6.png'
const PUBLIC = 'projects/1590/project-profile-image-c287962c.png'

let app, pi
beforeEach(() => {
  process.env.STREAM_TOKEN_SALT = 'test-salt'
  storageCalls.length = 0
  jest.isolateModules(() => {
    pi = require('../_services/images/private-image')
    pi.__clearCache()
    pi.__setStatusReader(async (id) => (id === 1134899 ? 'hidden' : 'published'))
    app = express()
    app.use('/images', require('./index'))
  })
})

describe('/images route: hidden-project covers', () => {
  test('unsigned hidden cover -> 403, no-store, and storage is NEVER touched', async () => {
    const r = await request(app).get(`/images/arbimon-profile/${HIDDEN}?w=144`)
    expect(r.status).toBe(403)
    expect(r.headers['cache-control']).toBe('private, no-store')
    expect(storageCalls).toEqual([])
  })

  test('signed hidden cover -> reaches storage (404 here: mocked absent)', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    const sig = pi.signImage('arbimon-profile', HIDDEN, exp)
    const r = await request(app).get(`/images/arbimon-profile/${HIDDEN}?w=144&exp=${exp}&sig=${sig}`)
    expect(r.status).toBe(404)
    expect(storageCalls.length).toBeGreaterThan(0)
  })

  test('public cover unsigned -> reaches storage as before', async () => {
    const r = await request(app).get(`/images/arbimon-profile/${PUBLIC}?w=144`)
    expect(r.status).toBe(404)
    expect(storageCalls.length).toBeGreaterThan(0)
  })
})

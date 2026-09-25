// HIDDEN-project cover gate (rfcx-local 2026-09-25). See private-image.js.
const pi = require('./private-image')

const ALIAS = 'arbimon-profile'
const HIDDEN_KEY = 'projects/1134899/project-profile-image-953566d6.png'
const PUBLIC_KEY = 'projects/1590/project-profile-image-c287962c.png'
const AVATAR_KEY = 'users/c14f57df/profile-image-1.jpg'
const NOW = 1790000000 * 1000

let lookups
beforeEach(() => {
  process.env.STREAM_TOKEN_SALT = 'test-salt'
  pi.__clearCache()
  lookups = 0
  pi.__setStatusReader(async (id) => { lookups++; return id === 1134899 ? 'hidden' : 'published' })
})

const signed = (key, exp) => ({ exp: String(exp), sig: pi.signImage(ALIAS, key, exp) })
const future = NOW / 1000 + 3600

describe('private-image: hidden project covers need a signature', () => {
  test('public project cover: served unsigned, public caching', async () => {
    expect(await pi.checkImageAccess(ALIAS, PUBLIC_KEY, { w: '144' }, NOW)).toEqual({ needsSignature: false, authorized: true })
  })

  test('avatars and non-project keys: never gated, no DB lookup', async () => {
    expect(await pi.checkImageAccess(ALIAS, AVATAR_KEY, {}, NOW)).toEqual({ needsSignature: false, authorized: true })
    expect(lookups).toBe(0)
  })

  test('hidden project cover UNSIGNED -> refused', async () => {
    expect(await pi.checkImageAccess(ALIAS, HIDDEN_KEY, { w: '144' }, NOW)).toEqual({ needsSignature: true, authorized: false })
  })

  test('hidden project cover with a valid signature -> served, private', async () => {
    expect(await pi.checkImageAccess(ALIAS, HIDDEN_KEY, signed(HIDDEN_KEY, future), NOW)).toEqual({ needsSignature: true, authorized: true })
  })

  test('valid signature needs no DB round-trip', async () => {
    await pi.checkImageAccess(ALIAS, HIDDEN_KEY, signed(HIDDEN_KEY, future), NOW)
    expect(lookups).toBe(0)
  })

  test('tampered, other-key, other-alias, extended, expired, == now, malformed -> refused', async () => {
    const good = signed(HIDDEN_KEY, future)
    const bad = [
      { ...good, sig: good.sig.replace(/^./, (c) => (c === '0' ? '1' : '0')) },
      signed('projects/1134899/other.png', future),
      { exp: String(future), sig: pi.signImage('arbimon', HIDDEN_KEY, future) },
      { ...good, exp: String(future + 86400) },
      signed(HIDDEN_KEY, NOW / 1000 - 1),
      signed(HIDDEN_KEY, NOW / 1000),
      { exp: 'abc', sig: good.sig },
      { exp: String(future), sig: 'x'.repeat(64) },
      { exp: String(future) }
    ]
    for (const q of bad) {
      expect((await pi.checkImageAccess(ALIAS, HIDDEN_KEY, q, NOW)).authorized).toBe(false)
    }
  })

  test('status lookup failure FAILS CLOSED (and is not cached)', async () => {
    pi.__setStatusReader(async () => { throw new Error('db down') })
    expect((await pi.checkImageAccess(ALIAS, PUBLIC_KEY, {}, NOW)).authorized).toBe(false)
    pi.__setStatusReader(async () => 'published')
    expect((await pi.checkImageAccess(ALIAS, PUBLIC_KEY, {}, NOW)).authorized).toBe(true)
  })

  test('status is cached for STATUS_TTL_MS, then re-read', async () => {
    await pi.checkImageAccess(ALIAS, PUBLIC_KEY, {}, NOW)
    await pi.checkImageAccess(ALIAS, PUBLIC_KEY, {}, NOW + 1000)
    expect(lookups).toBe(1)
    await pi.checkImageAccess(ALIAS, PUBLIC_KEY, {}, NOW + pi.STATUS_TTL_MS + 1)
    expect(lookups).toBe(2)
  })

  test('no salt -> signatures never verify (hidden stays refused)', async () => {
    const q = signed(HIDDEN_KEY, future)
    delete process.env.STREAM_TOKEN_SALT
    expect((await pi.checkImageAccess(ALIAS, HIDDEN_KEY, q, NOW)).authorized).toBe(false)
  })
})

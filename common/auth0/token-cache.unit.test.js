const { createTokenCache } = require('./token-cache')

function makeClock (startMs = 1_000_000) {
  let t = startMs
  return {
    now: () => t,
    advance: (ms) => { t += ms }
  }
}

function makeRequestFunc (responses) {
  // responses: array of either token objects or Error instances (thrown)
  let calls = 0
  const fn = jest.fn(async () => {
    const r = responses[Math.min(calls, responses.length - 1)]
    calls++
    if (r instanceof Error) { throw r }
    return r
  })
  return fn
}

const TOKEN_86400 = { access_token: 'tok-a', expires_in: 86400 }
const TOKEN_3600 = { access_token: 'tok-b', expires_in: 3600 }

describe('auth0 token cache', () => {
  test('token is reused for its real lifetime (seconds→ms fix)', async () => {
    // MUTATION PIN: with the old bug (expires_at = now + expires_in, no *1000)
    // an 86400s token appears expired after 86.4s, so the second call after
    // advancing 10 minutes would trigger a second request. This test FAILS
    // against the old arithmetic.
    const clock = makeClock()
    const cache = createTokenCache({ now: clock.now, delay: async () => {} })
    const req = makeRequestFunc([TOKEN_86400])

    expect(await cache.getAccessToken('client', req)).toBe('tok-a')
    clock.advance(10 * 60 * 1000) // 10 minutes — far beyond 86.4s, far within 86400s
    expect(await cache.getAccessToken('client', req)).toBe('tok-a')
    expect(req).toHaveBeenCalledTimes(1)
  })

  test('a 3600s token is not refreshed on the immediately-following call', async () => {
    // Old bug: expires_at = now + 3600 (ms) < refresh window ⇒ EVERY call refreshed.
    const clock = makeClock()
    const cache = createTokenCache({ now: clock.now, delay: async () => {} })
    const req = makeRequestFunc([TOKEN_3600])

    await cache.getAccessToken('client', req)
    clock.advance(10) // 10ms later
    await cache.getAccessToken('client', req)
    expect(req).toHaveBeenCalledTimes(1)
  })

  test('expires_at is stored in ms: expires_in * 1000 exactly', async () => {
    const clock = makeClock(500)
    const cache = createTokenCache({ now: clock.now, delay: async () => {} })
    await cache.getAccessToken('client', makeRequestFunc([TOKEN_3600]))
    expect(cache._peek('client').expires_at).toBe(500 + 3600 * 1000)
  })

  test('refreshes after true expiry', async () => {
    const clock = makeClock()
    const cache = createTokenCache({ now: clock.now, delay: async () => {} })
    const req = makeRequestFunc([TOKEN_3600, { access_token: 'tok-new', expires_in: 3600 }])

    expect(await cache.getAccessToken('client', req)).toBe('tok-b')
    clock.advance(3600 * 1000 + 1)
    expect(await cache.getAccessToken('client', req)).toBe('tok-new')
    expect(req).toHaveBeenCalledTimes(2)
  })

  test('inside the refresh margin: serves cached token, refreshes in background (SWR)', async () => {
    const clock = makeClock()
    const cache = createTokenCache({ now: clock.now, delay: async () => {}, refreshMarginMs: 60_000 })
    const req = makeRequestFunc([TOKEN_3600, { access_token: 'tok-new', expires_in: 3600 }])

    await cache.getAccessToken('client', req)
    clock.advance(3600 * 1000 - 30_000) // 30s left: inside 60s margin, not expired
    const served = await cache.getAccessToken('client', req)
    expect(served).toBe('tok-b') // still the cached one — no user-facing wait
    // background refresh landed
    await Promise.resolve()
    expect(req).toHaveBeenCalledTimes(2)
    expect(cache._peek('client').access_token).toBe('tok-new')
  })

  test('a failed refresh inside the margin does NOT fail the request', async () => {
    const clock = makeClock()
    const errors = []
    const cache = createTokenCache({
      now: clock.now,
      delay: async () => {},
      refreshMarginMs: 60_000,
      onError: (type, err) => errors.push(err)
    })
    const req = makeRequestFunc([TOKEN_3600, new Error('auth0 blip')])

    await cache.getAccessToken('client', req)
    clock.advance(3600 * 1000 - 30_000)
    await expect(cache.getAccessToken('client', req)).resolves.toBe('tok-b')
    await new Promise(resolve => setImmediate(resolve))
    expect(errors.length).toBe(1) // reported, not thrown
  })

  test('bounded retry: transient failure recovered within maxAttempts', async () => {
    const cache = createTokenCache({ now: () => 0, delay: async () => {}, maxAttempts: 3 })
    const req = makeRequestFunc([new Error('blip 1'), new Error('blip 2'), TOKEN_86400])
    await expect(cache.getAccessToken('client', req)).resolves.toBe('tok-a')
    expect(req).toHaveBeenCalledTimes(3)
  })

  test('exhausted retries throw with the underlying cause preserved', async () => {
    const cache = createTokenCache({ now: () => 0, delay: async () => {}, maxAttempts: 2 })
    const rootCause = new Error('ECONNRESET from auth0')
    const req = makeRequestFunc([rootCause])
    let thrown
    try {
      await cache.getAccessToken('client', req)
    } catch (e) {
      thrown = e
    }
    expect(thrown).toBeDefined()
    expect(thrown.message).toBe('Unable to get Auth0 "client" token')
    expect(thrown.cause).toBe(rootCause) // the old code discarded this
    expect(req).toHaveBeenCalledTimes(2)
  })

  test('empty token response is treated as a failure (retried, then thrown)', async () => {
    const cache = createTokenCache({ now: () => 0, delay: async () => {}, maxAttempts: 2 })
    const req = makeRequestFunc([{}, {}])
    await expect(cache.getAccessToken('client', req)).rejects.toThrow('Unable to get Auth0 "client" token')
    expect(req).toHaveBeenCalledTimes(2)
  })

  test('concurrent callers on an expired token share ONE refresh', async () => {
    const cache = createTokenCache({ now: () => 0, delay: async () => {} })
    let resolveToken
    const req = jest.fn(() => new Promise(resolve => { resolveToken = resolve }))
    const p1 = cache.getAccessToken('client', req)
    const p2 = cache.getAccessToken('client', req)
    resolveToken(TOKEN_86400)
    expect(await p1).toBe('tok-a')
    expect(await p2).toBe('tok-a')
    expect(req).toHaveBeenCalledTimes(1)
  })

  test('token types are cached independently', async () => {
    const cache = createTokenCache({ now: () => 0, delay: async () => {} })
    const reqA = makeRequestFunc([{ access_token: 'standard-tok', expires_in: 3600 }])
    const reqB = makeRequestFunc([{ access_token: 'client-tok', expires_in: 3600 }])
    expect(await cache.getAccessToken('standard', reqA)).toBe('standard-tok')
    expect(await cache.getAccessToken('client', reqB)).toBe('client-tok')
    expect(await cache.getAccessToken('standard', reqA)).toBe('standard-tok')
    expect(reqA).toHaveBeenCalledTimes(1)
    expect(reqB).toHaveBeenCalledTimes(1)
  })

  test('missing/invalid expires_in yields an immediately-stale token (refetch next call), not a crash', async () => {
    const clock = makeClock()
    const cache = createTokenCache({ now: clock.now, delay: async () => {} })
    const req = makeRequestFunc([
      { access_token: 'no-exp' },
      { access_token: 'no-exp-2' }
    ])
    expect(await cache.getAccessToken('client', req)).toBe('no-exp')
    clock.advance(1)
    expect(await cache.getAccessToken('client', req)).toBe('no-exp-2')
  })
})

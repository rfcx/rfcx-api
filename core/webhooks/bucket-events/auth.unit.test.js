const { computeHmac } = require('./auth')

describe('bucket-events webhook auth: computeHmac', () => {
  test('produces the expected sha256= prefixed hex for a known input', () => {
    const secret = 'topsecret'
    const body = Buffer.from('{"bucket":"rfcx-ingest-r2","key":"abc/def.opus"}')
    const sig = computeHmac(secret, body)
    expect(sig).toMatch(/^sha256=[0-9a-f]{64}$/)
    // Verified independently:
    //   echo -n '{"bucket":"rfcx-ingest-r2","key":"abc/def.opus"}' | \
    //     openssl dgst -sha256 -hmac topsecret -hex
    expect(sig).toBe('sha256=9ca63bd53084777bd0e991f530fd9e6ed1f5d47b82c06a220596d212008ae65a')
  })

  test('different bodies produce different signatures', () => {
    const secret = 'k'
    expect(computeHmac(secret, Buffer.from('a'))).not.toBe(computeHmac(secret, Buffer.from('b')))
  })

  test('different secrets produce different signatures', () => {
    const body = Buffer.from('payload')
    expect(computeHmac('s1', body)).not.toBe(computeHmac('s2', body))
  })
})

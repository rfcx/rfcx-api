const { redactCredential } = require('./logging-redact')

// A syntactically real but WORTHLESS token: signed by nothing, payload is a
// dummy. Never put a real credential in a test fixture.
const FAKE_JWT = [
  'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9',
  'eyJzdWIiOiJ0ZXN0LXN1YmplY3QiLCJleHAiOjk5OTk5OTk5OTl9',
  'c2lnbmF0dXJlLXBsYWNlaG9sZGVy'
].join('.')

describe('redactCredential', () => {
  test('a bearer token never appears in the output, in whole or in part', () => {
    const out = redactCredential(`Bearer ${FAKE_JWT}`)
    expect(out).not.toContain(FAKE_JWT)
    // The payload segment is the identity -- a truncation would still leak it.
    for (const segment of FAKE_JWT.split('.')) {
      expect(out).not.toContain(segment)
    }
    // Not even the distinctive JWT opening survives.
    expect(out).not.toContain('eyJ')
  })

  test('keeps the scheme and adds a short fingerprint', () => {
    expect(redactCredential(`Bearer ${FAKE_JWT}`)).toMatch(/^Bearer \[REDACTED:[0-9a-f]{8}\]$/)
  })

  test('the fingerprint is stable for one credential and differs across credentials', () => {
    const a = redactCredential(`Bearer ${FAKE_JWT}`)
    const b = redactCredential(`Bearer ${FAKE_JWT}`)
    const c = redactCredential('Bearer some.other.token')
    expect(a).toEqual(b)
    expect(a).not.toEqual(c)
  })

  test('anonymous / absent traffic stays distinguishable from a redacted credential', () => {
    // Measured 2026-09-15: 499 `Authorization: undefined` lines in 20 minutes.
    // That is real anonymous-traffic signal and must survive redaction.
    expect(redactCredential(undefined)).toBeUndefined()
    expect(redactCredential('undefined')).toEqual('undefined')
    expect(redactCredential('none')).toEqual('none')
    expect(redactCredential('')).toEqual('')
  })

  test('other schemes and bare credentials are redacted too', () => {
    expect(redactCredential('Basic dXNlcjpwYXNzd29yZA==')).toMatch(/^Basic \[REDACTED:[0-9a-f]{8}\]$/)
    expect(redactCredential('Basic dXNlcjpwYXNzd29yZA==')).not.toContain('dXNlcjpwYXNzd29yZA')
    // A cookie-borne id_token arrives with no scheme prefix.
    expect(redactCredential(FAKE_JWT)).toMatch(/^\[REDACTED:[0-9a-f]{8}\]$/)
    expect(redactCredential(FAKE_JWT)).not.toContain('eyJ')
  })
})

describe('the request logger itself', () => {
  test('NEGATIVE CONTROL: the built log line carries no token material', () => {
    // This is the assertion that actually protects production: it exercises the
    // real middleware msg() builder, not just the helper. It FAILS against the
    // pre-fix code (which interpolated req.headers.authorization directly).
    const { buildLogMessage: msg } = require('./logging')
    // If the builder ever stops being reachable the test must fail loudly
    // rather than silently pass on a no-op.
    expect(typeof msg).toBe('function')
    const req = {
      method: 'GET',
      url: '/internal/assets/streams/abc.png',
      headers: { authorization: `Bearer ${FAKE_JWT}` },
      body: {}
    }
    const res = { statusCode: 200, responseTime: 42 }
    const line = msg(req, res)
    expect(line).not.toContain(FAKE_JWT)
    expect(line).not.toContain('eyJ')
    expect(line).toContain('Authorization: Bearer [REDACTED:')
    // Shape preserved: the prefix that alert rules and support greps key on.
    expect(line).toContain('GET 200 /internal/assets/streams/abc.png Response Time: 42')
  })
})

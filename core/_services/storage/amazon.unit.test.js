// Unit tests for the rfcx-local streams-cache latency changes (2026-06-29):
// the single round-trip cache read `getObjectStreamOrNull`. We mock aws-sdk so
// no network/credentials are needed. Behaviour contract:
//   - 2xx  -> resolves the readable stream (cache HIT)
//   - 4xx  -> resolves null (cache MISS), draining the error body
//   - error before headers -> resolves null (treat unreachable as MISS)

// The mock factory is hoisted by jest, so it must be fully self-contained and
// may only reference globals. We stash the desired behaviour on globalThis and
// build the fake S3 inside the factory.
global.__s3Behaviour = { type: 'hit' }

jest.mock('aws-sdk', () => {
  const { PassThrough } = require('stream')
  function makeFakeS3 () {
    return {
      getObject () {
        const behaviour = global.__s3Behaviour
        const stream = new PassThrough()
        const handlers = {}
        const req = {
          on (event, cb) { handlers[event] = cb; return req },
          createReadStream () { return stream }
        }
        process.nextTick(() => {
          if (behaviour.type === 'hit') {
            if (handlers.httpHeaders) { handlers.httpHeaders(200, {}) }
            stream.end(Buffer.from('payload'))
          } else if (behaviour.type === 'miss') {
            if (handlers.httpHeaders) { handlers.httpHeaders(404, {}) }
            stream.emit('error', Object.assign(new Error('NoSuchKey'), { statusCode: 404 }))
          } else if (behaviour.type === 'neterror') {
            stream.emit('error', new Error('ECONNREFUSED'))
          }
        })
        return req
      },
      headObject (params, cb) { cb(null, {}) },
      putObject () { return { promise: () => Promise.resolve({}) } }
    }
  }
  return { S3: function () { return makeFakeS3() } }
})

// develop's amazon.js imports the S3 constructor directly via
// `require('aws-sdk/clients/s3')`, so mock that path too (returns the same fake
// constructor). Mocking both paths keeps this test valid regardless of which
// import style the storage module uses.
jest.mock('aws-sdk/clients/s3', () => {
  const { PassThrough } = require('stream')
  function makeFakeS3 () {
    return {
      getObject () {
        const behaviour = global.__s3Behaviour
        const stream = new PassThrough()
        const handlers = {}
        const req = {
          on (event, cb) { handlers[event] = cb; return req },
          createReadStream () { return stream }
        }
        process.nextTick(() => {
          if (behaviour.type === 'hit') {
            if (handlers.httpHeaders) { handlers.httpHeaders(200, {}) }
            stream.end(Buffer.from('payload'))
          } else if (behaviour.type === 'miss') {
            if (handlers.httpHeaders) { handlers.httpHeaders(404, {}) }
            stream.emit('error', Object.assign(new Error('NoSuchKey'), { statusCode: 404 }))
          } else if (behaviour.type === 'neterror') {
            stream.emit('error', new Error('ECONNREFUSED'))
          }
        })
        return req
      },
      headObject (params, cb) { cb(null, {}) },
      putObject () { return { promise: () => Promise.resolve({}) } }
    }
  }
  return function () { return makeFakeS3() }
})

const storage = require('./amazon')

describe('getObjectStreamOrNull', () => {
  test('resolves a readable stream on a 2xx (cache hit)', async () => {
    global.__s3Behaviour = { type: 'hit' }
    const result = await storage.getObjectStreamOrNull('rfcx-streams-cache-testing', 'k')
    expect(result).not.toBeNull()
    expect(typeof result.pipe).toBe('function')
  })

  test('resolves null on a 404 (cache miss)', async () => {
    global.__s3Behaviour = { type: 'miss' }
    const result = await storage.getObjectStreamOrNull('rfcx-streams-cache-testing', 'k')
    expect(result).toBeNull()
  })

  test('resolves null on a network error before headers', async () => {
    global.__s3Behaviour = { type: 'neterror' }
    const result = await storage.getObjectStreamOrNull('rfcx-streams-cache-testing', 'k')
    expect(result).toBeNull()
  })
})

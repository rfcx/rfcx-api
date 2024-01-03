// Hacks to override some of the dependencies in authorization.js
process.env.NODE_LOG_LEVEL = 'error'
jest.unmock('./authorization')
jest.mock('../../error-handling/http', () => ({}))
jest.mock('../../auth0', () => ({
  getUserRolesFromToken (token) {
    return token.roles
  }
}))

const { hasRole } = require('./authorization')

const mockAuth0UserRequest = (roles = []) => {
  return {
    user: {
      userType: 'auth0',
      roles
    }
  }
}

const mockResponse = () => {
  const res = {}
  res.sendStatus = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

test('hasRole returns forbidden when no role', async () => {
  const req = mockAuth0UserRequest()
  const res = mockResponse()
  const middleware = hasRole(['roleX'])
  await middleware(req, res, () => { })
  expect(res.sendStatus).toHaveBeenCalledWith(403)
})

test('hasRole returns forbidden when incorrect role', async () => {
  const req = mockAuth0UserRequest(['roleA'])
  const res = mockResponse()
  const middleware = hasRole(['roleB'])
  await middleware(req, res, () => { })
  expect(res.sendStatus).toHaveBeenCalledWith(403)
})

test('hasRole passes when correct role', async () => {
  const req = mockAuth0UserRequest(['roleC'])
  const res = mockResponse()
  const next = jest.fn().mockReturnValue(true)
  const middleware = hasRole(['roleC'])
  await middleware(req, res, next)
  expect(next).toHaveBeenCalled()
  expect(res.sendStatus).not.toHaveBeenCalled()
})

test('hasRole passes when only 1 role matches', async () => {
  const req = mockAuth0UserRequest(['roleE'])
  const res = mockResponse()
  const next = jest.fn().mockReturnValue(true)
  const middleware = hasRole(['roleD', 'roleE'])
  await middleware(req, res, next)
  expect(next).toHaveBeenCalled()
  expect(res.sendStatus).not.toHaveBeenCalled()
})

test('hasRole passes when user has many roles', async () => {
  const req = mockAuth0UserRequest(['roleG', 'roleH', 'roleI'])
  const res = mockResponse()
  const next = jest.fn().mockReturnValue(true)
  const middleware = hasRole(['roleH'])
  await middleware(req, res, next)
  expect(next).toHaveBeenCalled()
  expect(res.sendStatus).not.toHaveBeenCalled()
})

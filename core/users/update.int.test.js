const mockedToken = 'token123'
jest.mock('../../common/auth0', () => ({
  updateAuth0User: jest.fn().mockImplementation(() => Promise.resolve([{}, 200])),
  getToken: jest.fn().mockImplementation(() => Promise.resolve(mockedToken))
}))
const mockAuth = require('../../common/auth0')
const models = require('../_models')
const { expressApp, seedValues, muteConsole, truncateNonBase } = require('../../common/testing/sequelize')
const request = require('supertest')
const router = require('express').Router()

const user = {
  id: 333,
  guid: 'b7cc2c4e-bea3-11ed-afa1-0242ac120333',
  username: 'paulmitchell',
  email: 'paul@mitchell.org',
  firstname: 'Paul',
  lastname: 'Mitchell',
  picture: 'https://paul.mitchell'
}
const userSub = 'auth0|5e710676eb1ba30c80aeb333'

const app = expressApp({
  id: user.id,
  guid: user.guid,
  email: user.email,
  sub: userSub
})
router.patch('/:email', require('./update'))
app.use('/', router)

beforeAll(async () => {
  muteConsole(['warn', 'error'])
})

beforeEach(async () => {
  await models.User.destroy({ where: { email: user.email } })
  await models.User.create(user)
})

afterEach(async () => {
  await truncateNonBase(models)
  mockAuth.updateAuth0User.mockClear()
  mockAuth.getToken.mockClear()
})

afterAll(async () => {
  await models.sequelize.close()
})

describe('PATCH /users/{email}', () => {
  test('user can not change another user data', async () => {
    const requestBody = {
      firstname: 'Foo',
      lastname: 'Bar',
      picture: 'https://foo.bar'
    }
    const response = await request(app).patch(`/${seedValues.anotherUserEmail}`).send(requestBody)
    expect(response.statusCode).toBe(403)
  })
  test('user updated in Core and updated in Auth0', async () => {
    const requestBody = {
      firstname: 'Foo1',
      lastname: 'Bar1',
      picture: 'https://foo1.bar1'
    }
    const userBefore = await models.User.findOne({ where: { email: user.email } })
    const response = await request(app).patch(`/${user.email}`).send(requestBody)
    const userAfter = await models.User.findOne({ where: { email: user.email } })
    expect(response.statusCode).toBe(200)
    expect(userBefore.firstname).toBe(user.firstname)
    expect(userBefore.lastname).toBe(user.lastname)
    expect(userBefore.picture).toBe(user.picture)
    expect(userAfter.firstname).toBe(requestBody.firstname)
    expect(userAfter.lastname).toBe(requestBody.lastname)
    expect(userAfter.picture).toBe(requestBody.picture)
    const token = mockAuth.updateAuth0User.mock.calls[0][0]
    expect(token).toBe(mockedToken)
    const dataToUpdate = mockAuth.updateAuth0User.mock.calls[0][1]
    expect(dataToUpdate.given_name).toBe(requestBody.firstname)
    expect(dataToUpdate.family_name).toBe(requestBody.lastname)
    expect(dataToUpdate.picture).toBe(requestBody.picture)
  })
  test('Auth0 update has failed', async () => {
    mockAuth.updateAuth0User.mockImplementationOnce(() => {
      return Promise.resolve([null, 400])
    })
    const requestBody = {
      firstname: 'Foo1',
      lastname: 'Bar1',
      picture: 'https://foo1.bar1'
    }
    const response = await request(app).patch(`/${user.email}`).send(requestBody)
    const userAfter = await models.User.findOne({ where: { email: user.email } })
    expect(userAfter.firstname).toBe(user.firstname)
    expect(userAfter.lastname).toBe(user.lastname)
    expect(userAfter.picture).toBe(user.picture)
    expect(response.statusCode).toBe(400)
    expect(response.body.message).toBe('Failed updating user')
    const token = mockAuth.updateAuth0User.mock.calls[0][0]
    expect(token).toBe(mockedToken)
    const dataToUpdate = mockAuth.updateAuth0User.mock.calls[0][1]
    expect(dataToUpdate.given_name).toBe(requestBody.firstname)
    expect(dataToUpdate.family_name).toBe(requestBody.lastname)
    expect(dataToUpdate.picture).toBe(requestBody.picture)
  })
})

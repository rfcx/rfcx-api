jest.mock('../../common/auth0', () => ({
  createAuth0User: jest.fn().mockImplementation(() => Promise.resolve([{}, 201])),
  sendChangePasswordEmail: jest.fn()
}))
const mockAuth = require('../../common/auth0')
const models = require('../_models')
const { expressApp, seedValues, muteConsole, truncateNonBase } = require('../../common/testing/sequelize')
const request = require('supertest')
const router = require('express').Router()

const app = expressApp()
router.post('/', require('./create'))
app.use('/', router)

beforeAll(async () => {
  muteConsole(['warn', 'error'])
  await truncateNonBase(models)
  await models.sequelize.query('SELECT setval(\'users_id_seq\', (SELECT MAX(id) FROM users) + 1);')
})

afterEach(async () => {
  await truncateNonBase(models)
  mockAuth.createAuth0User.mockClear()
  mockAuth.sendChangePasswordEmail.mockClear()
})

afterAll(async () => {
  await truncateNonBase(models)
  await models.sequelize.close()
})

describe('POST /users', () => {
  describe('positive cases', () => {
    test('user created in Core and created in Auth0', async () => {
      const requestBody = {
        firstname: 'John',
        lastname: 'Doe',
        email: 'johndoe@rfcx.org'
      }
      const userBefore = await models.User.findOne({ where: { email: requestBody.email } })
      const response = await request(app).post('/').send(requestBody)
      const userAfter = await models.User.findOne({ where: { email: requestBody.email } })
      expect(response.statusCode).toBe(201)
      expect(userBefore).toBe(null)
      expect(userAfter.email).toBe(requestBody.email)
      expect(mockAuth.sendChangePasswordEmail).toHaveBeenCalledWith(requestBody.email)
      const data = mockAuth.createAuth0User.mock.calls[0][0]
      expect(data.email).toBe(requestBody.email)
      expect(data.guid).toBe(userAfter.guid)
      expect(data.invited).toBeTruthy()
      await userAfter.destroy()
    })
    test('user created in Core but exists in Auth0', async () => {
      mockAuth.createAuth0User.mockImplementationOnce(() => {
        return Promise.resolve([null, 409])
      })
      const requestBody = {
        firstname: 'John',
        lastname: 'Doe',
        email: 'johndoe@rfcx.org'
      }
      const userBefore = await models.User.findOne({ where: { email: requestBody.email } })
      const response = await request(app).post('/').send(requestBody)
      const userAfter = await models.User.findOne({ where: { email: requestBody.email } })
      expect(userBefore).toBe(null)
      expect(userAfter.email).toBe(requestBody.email)
      expect(mockAuth.sendChangePasswordEmail).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toBe(201)
      await userAfter.destroy()
    })
    test('user exists in Core but created in Auth0', async () => {
      const existingUser = await models.User.findByPk(seedValues.primaryUserId)
      const requestBody = {
        firstname: seedValues.primaryUserFirstname,
        lastname: seedValues.primaryUserLastname,
        email: seedValues.primaryUserEmail
      }
      const response = await request(app).post('/').send(requestBody)
      expect(existingUser).toBeDefined()
      expect(mockAuth.sendChangePasswordEmail).toHaveBeenCalledWith(seedValues.primaryUserEmail)
      expect(response.statusCode).toBe(201)
    })
  })
  describe('inputs validation', () => {
    test('missing firstname', async () => {
      const requestBody = {
        lastname: seedValues.primaryUserLastname,
        email: seedValues.primaryUserEmail
      }
      const response = await request(app).post('/').send(requestBody)
      expect(response.statusCode).toBe(400)
    })
    test('missing lastname', async () => {
      const requestBody = {
        firstname: seedValues.primaryUserFirstname,
        email: seedValues.primaryUserEmail
      }
      const response = await request(app).post('/').send(requestBody)
      expect(response.statusCode).toBe(400)
    })
    test('missing email', async () => {
      const requestBody = {
        firstname: seedValues.primaryUserFirstname,
        lastname: seedValues.primaryUserLastname
      }
      const response = await request(app).post('/').send(requestBody)
      expect(response.statusCode).toBe(400)
    })
    test('missing all params', async () => {
      const response = await request(app).post('/').send({})
      expect(response.statusCode).toBe(400)
    })
  })
  describe('failing cases', () => {
    test('user exists in Core and Auth0', async () => {
      mockAuth.createAuth0User.mockImplementationOnce(() => {
        return Promise.resolve([null, 409])
      })
      const requestBody = {
        firstname: seedValues.primaryUserFirstname,
        lastname: seedValues.primaryUserLastname,
        email: seedValues.primaryUserEmail
      }
      const response = await request(app).post('/').send(requestBody)
      expect(response.statusCode).toBe(409)
      expect(response.body.message).toBe('User already exists')
    })
    test('Auth0 creation has failed', async () => {
      mockAuth.createAuth0User.mockImplementationOnce(() => {
        return Promise.resolve([null, 400])
      })
      const requestBody = {
        firstname: seedValues.primaryUserFirstname,
        lastname: seedValues.primaryUserLastname,
        email: seedValues.primaryUserEmail
      }
      const response = await request(app).post('/').send(requestBody)
      expect(response.statusCode).toBe(400)
      expect(response.body.message).toBe('Failed creating user')
    })
  })
})

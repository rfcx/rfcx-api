const request = require('supertest')
const routes = require('./users')
const models = require('../../_models')
const arbimonService = require('../../_services/arbimon')
const { expressApp, truncateNonBase } = require('../../../common/testing/sequelize')

const app = expressApp()

app.use('/', routes)

afterEach(async () => {
  await truncateNonBase(models)
})

afterAll(async () => {
  await models.sequelize.close()
})

beforeEach(async () => {
  console.warn = jest.fn()
})

describe('POST /internal/auth0/new-login', () => {
  describe('Valid', () => {
    test('Normal', async () => {
      const body = {
        user_id: 'testuser0001'
      }
      const fn = jest.spyOn(arbimonService, 'createUser').mockReturnValue('')

      const response = await request(app).post(`/new-login`).send(body)
  
      expect(response.statusCode).toBe(200)
      expect(fn).toHaveBeenCalled()
      const user = await models.User.findOne({ where: { username: body.user_id } })
      expect(user).toBeTruthy()
    })
  })
})

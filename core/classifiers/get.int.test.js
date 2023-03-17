const routes = require('./index')
const models = require('../_models')
const { truncateNonBase, expressApp, seedValues } = require('../../common/testing/sequelize')
const request = require('supertest')

const app = expressApp()

app.use('/', routes)

beforeEach(async () => {
  await commonSetup()
})
afterEach(async () => {
  await truncateNonBase(models)
})

async function commonSetup () {
  const CLASSIFIER_MODEL = { id: 1, name: 'chainsaw', externalId: '843cb81d-03b9-07e1-5184-931c95265213', version: 1, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: '', isPublic: true }
  const CLASSIFIER_MODEL_2 = { id: 2, name: 'dogbark', externalId: '843cb81d-03b9-07e1-5184-931c95265214', version: 5, createdById: seedValues.anotherUserId, modelRunner: 'tf2', modelUrl: '', isPublic: false }
  const CLASSIFIER_MODEL_3 = { id: 3, name: 'pr-parrot', externalId: '843cb81d-03b9-07e1-5184-931c95265215', version: 1, createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: '', isPublic: true }
  const CLASSIFIER_MODEL_4 = { id: 4, name: 'vehicle', externalId: '843cb81d-03b9-07e1-5184-931c95265216', version: 1, createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: '', isPublic: false }
  await models.Classifier.bulkCreate([CLASSIFIER_MODEL, CLASSIFIER_MODEL_2, CLASSIFIER_MODEL_3, CLASSIFIER_MODEL_4])
}

describe('GET /classifier/:id', () => {
  describe('successful', () => {
    test('super user can get public classifier', async () => {
      const regularUserApp = expressApp({ is_super: true })
      regularUserApp.use('/', routes)
      console.warn = jest.fn()

      const response = await request(regularUserApp).get('/1')

      expect(response.statusCode).toBe(200)
      expect(response.body.id).toBe(1)
    })

    test('super user can get private classifier', async () => {
      const regularUserApp = expressApp({ is_super: true })
      regularUserApp.use('/', routes)
      console.warn = jest.fn()

      const response = await request(regularUserApp).get('/2')

      expect(response.statusCode).toBe(200)
      expect(response.body.id).toBe(2)
    })

    test('system role can get public classifier', async () => {
      const regularUserApp = expressApp({ has_system_role: true })
      regularUserApp.use('/', routes)
      console.warn = jest.fn()

      const response = await request(regularUserApp).get('/1')

      expect(response.statusCode).toBe(200)
      expect(response.body.id).toBe(1)
    })

    test('system role can get private classifier', async () => {
      const regularUserApp = expressApp({ has_system_role: true })
      regularUserApp.use('/', routes)
      console.warn = jest.fn()

      const response = await request(regularUserApp).get('/2')

      expect(response.statusCode).toBe(200)
      expect(response.body.id).toBe(2)
    })

    test('owner can get his/her public classifier', async () => {
      const regularUserApp = expressApp({ user: { id: seedValues.primaryUserId } })
      regularUserApp.use('/', routes)
      console.warn = jest.fn()

      const response = await request(regularUserApp).get('/3')

      expect(response.statusCode).toBe(200)
      expect(response.body.id).toBe(3)
    })

    test('owner can get his/her private classifier', async () => {
      const regularUserApp = expressApp({ user: { id: seedValues.primaryUserId } })
      regularUserApp.use('/', routes)
      console.warn = jest.fn()

      const response = await request(regularUserApp).get('/4')

      expect(response.statusCode).toBe(200)
      expect(response.body.id).toBe(4)
    })

    test('normal user can get public classifier', async () => {
      const regularUserApp = expressApp({ user: { id: seedValues.primaryUserId } })
      regularUserApp.use('/', routes)
      console.warn = jest.fn()

      const response = await request(regularUserApp).get('/1')

      expect(response.statusCode).toBe(200)
      expect(response.body.id).toBe(1)
    })
  })

  describe('error', () => {
    test('super user with invalid classifier id', async () => {
      const regularUserApp = expressApp({ is_super: true })
      regularUserApp.use('/', routes)
      console.warn = jest.fn()

      const response = await request(regularUserApp).get('/x')

      expect(response.statusCode).toBe(400)
    })

    test('super user with missing classifier id', async () => {
      const regularUserApp = expressApp({ is_super: true })
      regularUserApp.use('/', routes)
      console.warn = jest.fn()

      const response = await request(regularUserApp).get('/999')

      expect(response.statusCode).toBe(404)
    })

    test('normal user can not get private classifier of another owner', async () => {
      const regularUserApp = expressApp({ user: { id: seedValues.primaryUserId } })
      regularUserApp.use('/', routes)
      console.warn = jest.fn()

      const response = await request(regularUserApp).get('/2')

      expect(response.statusCode).toBe(403)
    })
  })
})

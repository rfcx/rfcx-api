const routes = require('./index')
const models = require('../_models')
const { truncateNonBase, expressApp, seedValues } = require('../../common/testing/sequelize')
const request = require('supertest')

const app = expressApp()

app.use('/', routes)

afterEach(async () => {
  await truncateNonBase(models)
})
afterAll(async () => {
  await models.sequelize.close()
})

async function commonSetup () {
  const classifier1 = await models.Classifier.create({ name: 'chainsaw', externalId: '843cb81d-03b9-07e1-5184-931c95265213', version: 1, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: '', isPublic: true })
  const classifier2 = await models.Classifier.create({ name: 'dogbark', externalId: '843cb81d-03b9-07e1-5184-931c95265214', version: 5, createdById: seedValues.anotherUserId, modelRunner: 'tf2', modelUrl: '', isPublic: false })
  const classifier3 = await models.Classifier.create({ name: 'pr-parrot', externalId: '843cb81d-03b9-07e1-5184-931c95265215', version: 1, createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: '', isPublic: true })
  const classifier4 = await models.Classifier.create({ name: 'vehicle', externalId: '843cb81d-03b9-07e1-5184-931c95265216', version: 1, createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: '', isPublic: false })
  return { classifier1, classifier2, classifier3, classifier4 }
}

describe('GET /classifier/:id', () => {
  describe('successful', () => {
    test('super user can get public classifier', async () => {
      const { classifier1 } = await commonSetup()
      const regularUserApp = expressApp({ is_super: true })
      regularUserApp.use('/', routes)
      console.warn = jest.fn()

      const response = await request(regularUserApp).get(`/${classifier1.id}`)

      expect(response.statusCode).toBe(200)
      expect(response.body.name).toBe(classifier1.name)
    })

    test('super user can get private classifier', async () => {
      const { classifier2 } = await commonSetup()
      const regularUserApp = expressApp({ is_super: true })
      regularUserApp.use('/', routes)
      console.warn = jest.fn()

      const response = await request(regularUserApp).get(`/${classifier2.id}`)

      expect(response.statusCode).toBe(200)
      expect(response.body.name).toBe(classifier2.name)
    })

    test('system role can get public classifier', async () => {
      const { classifier1 } = await commonSetup()
      const regularUserApp = expressApp({ has_system_role: true })
      regularUserApp.use('/', routes)
      console.warn = jest.fn()

      const response = await request(regularUserApp).get(`/${classifier1.id}`)

      expect(response.statusCode).toBe(200)
      expect(response.body.name).toBe(classifier1.name)
    })

    test('system role can get private classifier', async () => {
      const { classifier2 } = await commonSetup()
      const regularUserApp = expressApp({ has_system_role: true })
      regularUserApp.use('/', routes)
      console.warn = jest.fn()

      const response = await request(regularUserApp).get(`/${classifier2.id}`)

      expect(response.statusCode).toBe(200)
      expect(response.body.name).toBe(classifier2.name)
    })

    test('owner can get his/her public classifier', async () => {
      const { classifier3 } = await commonSetup()
      const regularUserApp = expressApp({ user: { id: seedValues.primaryUserId } })
      regularUserApp.use('/', routes)
      console.warn = jest.fn()

      const response = await request(regularUserApp).get(`/${classifier3.id}`)

      expect(response.statusCode).toBe(200)
      expect(response.body.name).toBe(classifier3.name)
    })

    test('owner can get his/her private classifier', async () => {
      const { classifier4 } = await commonSetup()
      const regularUserApp = expressApp({ user: { id: seedValues.primaryUserId } })
      regularUserApp.use('/', routes)
      console.warn = jest.fn()

      const response = await request(regularUserApp).get(`/${classifier4.id}`)

      expect(response.statusCode).toBe(200)
      expect(response.body.name).toBe(classifier4.name)
    })

    test('normal user can get public classifier', async () => {
      const { classifier1 } = await commonSetup()
      const regularUserApp = expressApp({ user: { id: seedValues.primaryUserId } })
      regularUserApp.use('/', routes)
      console.warn = jest.fn()

      const response = await request(regularUserApp).get(`/${classifier1.id}`)

      expect(response.statusCode).toBe(200)
      expect(response.body.name).toBe(classifier1.name)
    })
  })

  describe('error', () => {
    test('super user with invalid classifier id', async () => {
      const regularUserApp = expressApp({ is_super: true })
      regularUserApp.use('/', routes)
      console.warn = jest.fn()

      const response = await request(regularUserApp).get('/x')

      expect(response.statusCode).toBe(404)
    })

    test('super user with missing classifier id', async () => {
      const regularUserApp = expressApp({ is_super: true })
      regularUserApp.use('/', routes)
      console.warn = jest.fn()

      const response = await request(regularUserApp).get('/999')

      expect(response.statusCode).toBe(404)
    })

    test('normal user can not get private classifier of another owner', async () => {
      const { classifier2 } = await commonSetup()
      const regularUserApp = expressApp({ user: { id: seedValues.primaryUserId } })
      regularUserApp.use('/', routes)
      console.warn = jest.fn()

      const response = await request(regularUserApp).get(`/${classifier2.id}`)

      expect(response.statusCode).toBe(403)
    })
  })
})

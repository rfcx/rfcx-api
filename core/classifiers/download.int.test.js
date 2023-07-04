const routes = require('./index')
const models = require('../_models')
const { truncateNonBase, expressApp, seedValues } = require('../../common/testing/sequelize')
const request = require('supertest')
const { EmptyResultError } = require('../../common/error-handling/errors')

const app = expressApp()

app.use('/', routes)

jest.mock('./dao/download', () => ({ getSignedUrl: jest.fn((url) => Promise.resolve(`${url}?123`)) }))

afterEach(async () => {
  await truncateNonBase(models)
})
afterAll(async () => {
  await models.sequelize.close()
})

async function commonSetup () {
  const model1 = (await models.Classifier.findOrCreate({ where: { name: 'chainsaw', externalId: '843cb81d-03b9-07e1-5184-931c95265213', version: 1, createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: 's3://rfcx-ai-dev/classifiers/7v3ag23b.tar.gz', isPublic: true } }))[0]
  const model2 = (await models.Classifier.findOrCreate({ where: { name: 'dogbark', externalId: '843cb81d-03b9-07e1-5184-931c95265214', version: 5, createdById: seedValues.anotherUserId, modelRunner: 'tf2', modelUrl: '', isPublic: false } }))[0]
  return { model1, model2 }
}

describe('GET /classifier/:id/file', () => {
  describe('successful', () => {
    test('get classifier', async () => {
      const { model1 } = await commonSetup()
      const regularUserApp = expressApp({ is_super: true })
      regularUserApp.use('/', routes)
      console.warn = jest.fn()

      const response = await request(regularUserApp).get(`/${model1.id}/file`)

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(`${model1.modelUrl}?123`)
    })
  })

  describe('error', () => {
    test('missing model url', async () => {
      require('./dao/download').getSignedUrl.mockImplementation(() => Promise.reject(new EmptyResultError('Storage url not recognised')))
      const regularUserApp = expressApp({ is_super: true })
      regularUserApp.use('/', routes)
      console.warn = jest.fn()

      const response = await request(regularUserApp).get('/2324/file')

      expect(response.statusCode).toBe(404)
    })
  })
})

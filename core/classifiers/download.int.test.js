const routes = require('./index')
const models = require('../_models')
const { truncateNonBase, expressApp, seedValues } = require('../../common/testing/sequelize')
const request = require('supertest')
const { EmptyResultError } = require('../../common/error-handling/errors')

const app = expressApp()

app.use('/', routes)

jest.mock('./dao/download', () => ({ getSignedUrl: jest.fn((url) => Promise.resolve(url + '?123')) }))

beforeEach(async () => {
  await commonSetup()
})
afterEach(async () => {
  await truncateNonBase(models)
})

async function commonSetup () {
  const CLASSIFIER_MODEL = { id: 1, name: 'chainsaw', externalId: '843cb81d-03b9-07e1-5184-931c95265213', version: 1, createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: 's3://rfcx-ai-dev/classifiers/7v3ag23b.tar.gz', isPublic: true }
  const CLASSIFIER_MODEL_2 = { id: 2, name: 'dogbark', externalId: '843cb81d-03b9-07e1-5184-931c95265214', version: 5, createdById: seedValues.anotherUserId, modelRunner: 'tf2', modelUrl: '', isPublic: false }
  await models.Classifier.bulkCreate([CLASSIFIER_MODEL, CLASSIFIER_MODEL_2])
}

describe('GET /classifier/:id/file', () => {
  describe('successful', () => {
    test('get classifier', async () => {
      const regularUserApp = expressApp({ is_super: true })
      regularUserApp.use('/', routes)
      console.warn = jest.fn()

      const response = await request(regularUserApp).get('/1/file')

      expect(response.statusCode).toBe(302)
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

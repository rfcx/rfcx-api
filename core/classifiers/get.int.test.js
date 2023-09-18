const routes = require('./index')
const models = require('../_models')
const { truncateNonBase, expressApp, seedValues } = require('../../common/testing/sequelize')
const request = require('supertest')

const app = expressApp()

app.use('/', routes)

const CLASSIFICATION_1 = { id: 1, value: 'chainsaw', title: 'chainsaw', typeId: 1, sourceId: null, parent_id: null, source_external_id: null, created_at: '2022-06-29 11:22:37.094935' }
const CLASSIFICATION_2 = { id: 2, value: 'vehicle', title: 'vehicle', typeId: 1, sourceId: null, parent_id: null, source_external_id: null, created_at: '2022-06-29 11:22:37.094935' }
const CLASSIFICATIONS = [CLASSIFICATION_1, CLASSIFICATION_2]

const CLASSIFIER_1 = { id: 1, name: 'chainsaw', externalId: '843cb81d-03b9-07e1-5184-931c95265213', version: 1, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: '', isPublic: true }
const CLASSIFIER_2 = { id: 2, name: 'dogbark', externalId: '843cb81d-03b9-07e1-5184-931c95265214', version: 5, createdById: seedValues.anotherUserId, modelRunner: 'tf2', modelUrl: '', isPublic: false }
const CLASSIFIER_3 = { id: 3, name: 'pr-parrot', externalId: '843cb81d-03b9-07e1-5184-931c95265215', version: 1, createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: '', isPublic: true }
const CLASSIFIER_4 = { id: 4, name: 'vehicle', externalId: '843cb81d-03b9-07e1-5184-931c95265216', version: 1, createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: '', isPublic: false }
const CLASSIFIERS = [CLASSIFIER_1, CLASSIFIER_2, CLASSIFIER_3, CLASSIFIER_4]

const OUTPUT_1 = { classificationId: CLASSIFICATION_1.id, classifier_id: CLASSIFIER_1.id, outputClassName: 'chainsaw 1', ignoreThreshold: 0.7 }
const OUTPUT_2 = { classificationId: CLASSIFICATION_2.id, classifier_id: CLASSIFIER_1.id, outputClassName: 'vehicle 1', ignoreThreshold: 0.9 }
const OUTPUTS = [OUTPUT_1, OUTPUT_2]

beforeEach(async () => {
  await commonSetup()
})
afterEach(async () => {
  await truncateNonBase(models)
})
afterAll(async () => {
  await models.sequelize.close()
})

async function commonSetup () {
  await models.Classification.bulkCreate(CLASSIFICATIONS)
  await models.Classifier.bulkCreate(CLASSIFIERS)
  await models.ClassifierOutput.bulkCreate(OUTPUTS)
}

describe('GET /classifier/:id', () => {
  describe('successful', () => {
    test('super user can get public classifier', async () => {
      const regularUserApp = expressApp({ is_super: true })
      regularUserApp.use('/', routes)
      console.warn = jest.fn()

      const response = await request(regularUserApp).get(`/${CLASSIFIER_1.id}`)

      expect(response.statusCode).toBe(200)
      const classifier = response.body
      expect(classifier.name).toBe(CLASSIFIER_1.name)
      expect(classifier.id).toBe(CLASSIFIER_1.id)
      expect(classifier.version).toBe(CLASSIFIER_1.version)
      expect(classifier.lastExecutedAt).toBeNull()
      expect(classifier.createdById).toBeUndefined()
      expect(classifier.isPublic).toBeUndefined()
    })

    test('super user can get private classifier', async () => {
      const regularUserApp = expressApp({ is_super: true })
      regularUserApp.use('/', routes)
      console.warn = jest.fn()

      const response = await request(regularUserApp).get(`/${CLASSIFIER_2.id}`)

      expect(response.statusCode).toBe(200)
      expect(response.body.name).toBe(CLASSIFIER_2.name)
    })

    test('system role can get public classifier', async () => {
      const regularUserApp = expressApp({ has_system_role: true })
      regularUserApp.use('/', routes)
      console.warn = jest.fn()

      const response = await request(regularUserApp).get(`/${CLASSIFIER_1.id}`)

      expect(response.statusCode).toBe(200)
      expect(response.body.name).toBe(CLASSIFIER_1.name)
    })

    test('system role can get private classifier', async () => {
      const regularUserApp = expressApp({ has_system_role: true })
      regularUserApp.use('/', routes)
      console.warn = jest.fn()

      const response = await request(regularUserApp).get(`/${CLASSIFIER_2.id}`)

      expect(response.statusCode).toBe(200)
      expect(response.body.name).toBe(CLASSIFIER_2.name)
    })

    test('owner can get his/her public classifier', async () => {
      const regularUserApp = expressApp({ user: { id: seedValues.primaryUserId } })
      regularUserApp.use('/', routes)
      console.warn = jest.fn()

      const response = await request(regularUserApp).get(`/${CLASSIFIER_3.id}`)

      expect(response.statusCode).toBe(200)
      expect(response.body.name).toBe(CLASSIFIER_3.name)
    })

    test('owner can get his/her private classifier', async () => {
      const regularUserApp = expressApp({ user: { id: seedValues.primaryUserId } })
      regularUserApp.use('/', routes)
      console.warn = jest.fn()

      const response = await request(regularUserApp).get(`/${CLASSIFIER_4.id}`)

      expect(response.statusCode).toBe(200)
      expect(response.body.name).toBe(CLASSIFIER_4.name)
    })

    test('normal user can get public classifier', async () => {
      const regularUserApp = expressApp({ user: { id: seedValues.primaryUserId } })
      regularUserApp.use('/', routes)
      console.warn = jest.fn()

      const response = await request(regularUserApp).get(`/${CLASSIFIER_1.id}`)

      expect(response.statusCode).toBe(200)
      expect(response.body.name).toBe(CLASSIFIER_1.name)
    })

    test('customizable fields', async () => {
      const regularUserApp = expressApp({ user: { id: seedValues.primaryUserId } })
      regularUserApp.use('/', routes)
      console.warn = jest.fn()

      const response = await request(regularUserApp).get(`/${CLASSIFIER_1.id}`).query({ fields: ['name', 'outputs'] })

      expect(response.statusCode).toBe(200)
      const classifier = response.body
      expect(classifier.name).toBe(CLASSIFIER_1.name)
      expect(classifier.id).toBeUndefined()
      expect(classifier.version).toBeUndefined()
      expect(classifier.lastExecutedAt).toBeUndefined()
      expect(classifier.isPublic).toBeUndefined()
      expect(classifier.createdById).toBeUndefined()
      expect(classifier.outputs).toBeDefined()
      expect(classifier.outputs[0].outputClassname).toBe(OUTPUT_1.outputClassname)
      expect(classifier.outputs[0].ignoreThreshold).toBe(OUTPUT_1.ignoreThreshold)
      expect(classifier.outputs[0].classification).toBeDefined()
      expect(classifier.outputs[0].classification.value).toBe(CLASSIFICATION_1.value)
      expect(classifier.outputs[0].classification.label).toBe(CLASSIFICATION_1.label)
      expect(classifier.outputs[1].outputClassname).toBe(OUTPUT_2.outputClassname)
      expect(classifier.outputs[1].ignoreThreshold).toBe(OUTPUT_2.ignoreThreshold)
      expect(classifier.outputs[1].classification).toBeDefined()
      expect(classifier.outputs[1].classification.value).toBe(CLASSIFICATION_2.value)
      expect(classifier.outputs[1].classification.label).toBe(CLASSIFICATION_2.label)
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
      const regularUserApp = expressApp({ user: { id: seedValues.primaryUserId } })
      regularUserApp.use('/', routes)
      console.warn = jest.fn()

      const response = await request(regularUserApp).get(`/${CLASSIFIER_2.id}`)

      expect(response.statusCode).toBe(403)
    })
  })
})

const request = require('supertest')
const routes = require('.')
const models = require('../_models')
const { expressApp, seedValues, truncateNonBase } = require('../../common/testing/sequelize')

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
  await commonSetup()
})

const CLASSIFICATION_1 = { id: 1, value: 'chainsaw', title: 'chainsaw', typeId: 1, sourceId: null, parent_id: null, source_external_id: null, created_at: '2021-04-14T00:00:00.000Z' }
const CLASSIFICATION_2 = { id: 2, value: 'vehicle', title: 'vehicle', typeId: 1, sourceId: null, parent_id: null, source_external_id: null, created_at: '2021-04-14T00:00:00.000Z' }
const CLASSIFICATIONS = [CLASSIFICATION_1, CLASSIFICATION_2]

const CLASSIFIER_1 = { id: 1, name: 'chainsaw', externalId: '843cb81d-03b9-07e1-5184-931c95265213', version: 1, createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: '', isPublic: true }
const CLASSIFIERS = [CLASSIFIER_1]

const OUTPUT_1 = { classificationId: CLASSIFICATION_1.id, classifier_id: CLASSIFIER_1.id, outputClassName: 'chainsaw 1', ignoreThreshold: 0.7 }
const OUTPUTS = [OUTPUT_1]

async function commonSetup () {
  await models.Classification.bulkCreate(CLASSIFICATIONS)
  await models.Classifier.bulkCreate(CLASSIFIERS)
  await models.ClassifierOutput.bulkCreate(OUTPUTS)
}

describe('GET /classifications', () => {
  describe('Valid', () => {
    test('Without Params', async () => {

      const response = await request(app).get('/').query()
  
      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(2)
      expect(response.body[0].title).toBe(CLASSIFICATION_1.title)
      expect(response.body[1].title).toBe(CLASSIFICATION_2.title)
    })

    test('with [`keyword`] as `chain` params', async () => {
      const params = {
        keyword: 'chain'
      }

      const response = await request(app).get('/').query(params)
  
      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(1)
      expect(response.body[0].title).toBe(CLASSIFICATION_1.title)
    })

    test('with [`keyword`] as `chainsaw` params', async () => {
      const params = {
        keyword: 'chainsaw'
      }

      const response = await request(app).get('/').query(params)
  
      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(1)
      expect(response.body[0].title).toBe(CLASSIFICATION_1.title)
    })

    test('with [`keyword`] as `vehicle` params', async () => {
      const params = {
        keyword: 'vehicle'
      }

      const response = await request(app).get('/').query(params)
  
      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(1)
      expect(response.body[0].title).toBe(CLASSIFICATION_2.title)
    })

    test('with [`keyword`] as random params', async () => {
      const params = {
        keyword: 'abc'
      }

      const response = await request(app).get('/').query(params)
  
      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(0)
    })

    test('with [`levels`] as [`unknown`, `species`] params', async () => {
      const params = {
        levels: ['unknown', 'species']
      }

      const response = await request(app).get('/').query(params)
  
      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(2)
      expect(response.body[0].title).toBe(CLASSIFICATION_1.title)
      expect(response.body[1].title).toBe(CLASSIFICATION_2.title)
    })

    test('with [`levels`] as [`species`] params', async () => {
      const params = {
        levels: ['species']
      }

      const response = await request(app).get('/').query(params)
  
      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(0)
    })

    test('with [`classifiers`] as `[1]` params', async () => {
      const params = {
        classifiers: [1]
      }

      const response = await request(app).get('/').query(params)
  
      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(1)
      expect(response.body[0].title).toBe(CLASSIFICATION_1.title)
    })

    test('with [`classifiers`] as `[2]` params', async () => {
      const params = {
        classifiers: [2]
      }

      const response = await request(app).get('/').query(params)
  
      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(0)
    })
  })
  describe('Invalid', () => {
    test('Invalid Params', async () => {
      const params = {
        limit: 'abc'
      }

      const response = await request(app).get('/').query(params)
  
      expect(response.statusCode).toBe(400)
    })
  })
})

describe('GET /classifications/:value', () => {
  describe('Valid', () => {
    test('`value` as `chainsaw`', async () => {
      const value = 'chainsaw'

      const response = await request(app).get(`/${value}`).query()
  
      expect(response.statusCode).toBe(200)
      expect(response.body.value).toBe(CLASSIFICATION_1.value)
    })

    test('`value` as `vehicle`', async () => {
      const value = 'vehicle'

      const response = await request(app).get(`/${value}`).query()
  
      expect(response.statusCode).toBe(200)
      expect(response.body.value).toBe(CLASSIFICATION_2.value)
    })
  })
  describe('Invalid', () => {
    test('Not found `value` as `chain`', async () => {
      const value = 'chain'

      const response = await request(app).get(`/${value}`).query()
  
      expect(response.statusCode).toBe(404)
    })
  })
})

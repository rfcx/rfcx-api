const routes = require('./index')
const models = require('../_models')
const { migrate, truncate, expressApp, seed, seedValues } = require('../../common/testing/sequelize')
const request = require('supertest')

const app = expressApp()

app.use('/', routes)

beforeAll(async () => {
  await migrate(models.sequelize, models.Sequelize)
  await seed(models)
})
beforeEach(async () => {
  await truncate(models)
  await commonSetup()
})

async function commonSetup () {
  const CLASSIFIER_MODEL = { id: 1, name: 'chainsaw', externalId: '843cb81d-03b9-07e1-5184-931c95265213', version: 1, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: '', isPublic: true }
  const CLASSIFIER_MODEL_2 = { id: 2, name: 'dogbark', externalId: '843cb81d-03b9-07e1-5184-931c95265214', version: 5, createdById: seedValues.anotherUserId, modelRunner: 'tf2', modelUrl: '', isPublic: false }
  const CLASSIFIER_MODEL_3 = { id: 3, name: 'pr-parrot', externalId: '843cb81d-03b9-07e1-5184-931c95265215', version: 1, createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: '', isPublic: true }
  await models.Classifier.bulkCreate([CLASSIFIER_MODEL, CLASSIFIER_MODEL_2, CLASSIFIER_MODEL_3])
}

describe('GET /classifiers', () => {
  test('returns successfully', async () => {
    const response = await request(app).get('/')

    const result = response.body
    expect(response.statusCode).toBe(200)
    expect(result).toBeDefined()
    expect(Array.isArray(result)).toBe(true)
  })

  test('can set all fields', async () => {
    const query = {
      is_public: true,
      created_by: 'me',
      limit: 2,
      offset: 0
    }

    const response = await request(app).get('/').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body.length).toEqual(1)
  })

  test('get correct classifiers models with is_public filter', async () => {
    const query = {
      is_public: true
    }

    const response = await request(app).get('/').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body.length).toEqual(2)
  })

  test('get correct classifiers models with created by me filter', async () => {
    const query = {
      created_by: 'me'
    }

    const response = await request(app).get('/').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body.length).toEqual(1)
  })
})

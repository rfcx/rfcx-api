const routes = require('./index')
const models = require('../_models')
const { expressApp, seedValues, truncateNonBase } = require('../../common/testing/sequelize')
const request = require('supertest')

const app = expressApp()

app.use('/', routes)

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
  const CLASSIFIER_MODEL = { id: 1, name: 'chainsaw', externalId: '843cb81d-03b9-07e1-5184-931c95265213', version: 1, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: '', isPublic: true }
  const CLASSIFIER_MODEL_2 = { id: 2, name: 'dogbark', externalId: '843cb81d-03b9-07e1-5184-931c95265214', version: 5, createdById: seedValues.anotherUserId, modelRunner: 'tf2', modelUrl: '', isPublic: false }
  const CLASSIFIER_MODEL_3 = { id: 3, name: 'pr-parrot', externalId: '843cb81d-03b9-07e1-5184-931c95265215', version: 1, createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: '', isPublic: true }
  const CLASSIFIER_MODEL_4 = { id: 4, name: 'vehicle', externalId: '843cb81d-03b9-07e1-5184-931c95265216', version: 1, createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: '', isPublic: false }
  await models.Classifier.bulkCreate([CLASSIFIER_MODEL, CLASSIFIER_MODEL_2, CLASSIFIER_MODEL_3, CLASSIFIER_MODEL_4])
}

describe('GET /classifiers', () => {
  test('response is an array', async () => {
    const response = await request(app).get('/')

    expect(response.statusCode).toBe(200)
    expect(Array.isArray(response.body)).toBe(true)
  })

  test('get public classifiers and created by the given user id (user public and private classifiers)', async () => {
    const response = await request(app).get('/')

    expect(response.statusCode).toBe(200)
    expect(response.body).toHaveLength(3)
  })

  test('set the limit and offset', async () => {
    const query = {
      limit: 1,
      offset: 2
    }

    const response = await request(app).get('/').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body).toHaveLength(1)
    expect(response.body[0].id).toEqual(4)
  })
})

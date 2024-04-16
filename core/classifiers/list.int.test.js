const routes = require('./index')
const models = require('../_models')
const { expressApp, seedValues, truncateNonBase } = require('../../common/testing/sequelize')
const request = require('supertest')
const _ = require('lodash')

const app = expressApp()

app.use('/', routes)

const CLASSIFIER_1 = { id: 1, name: 'chainsaw', externalId: '843cb81d-03b9-07e1-5184-931c95265213', version: 1, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: '', isPublic: true }
const CLASSIFIER_2 = { id: 2, name: 'dogbark', externalId: '843cb81d-03b9-07e1-5184-931c95265214', version: 5, createdById: seedValues.anotherUserId, modelRunner: 'tf2', modelUrl: '', isPublic: false }
const CLASSIFIER_3 = { id: 3, name: 'pr-parrot', externalId: '843cb81d-03b9-07e1-5184-931c95265215', version: 1, createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: '', isPublic: true }
const CLASSIFIER_4 = { id: 4, name: 'vehicle', externalId: '843cb81d-03b9-07e1-5184-931c95265216', version: 1, createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: '', isPublic: false }
const CLASSIFIER_5 = { id: 5, name: 'aeroplane', externalId: '843cb81d-03b9-07e1-5184-931c95265217', version: 1, createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: '', isPublic: false }
const CLASSIFIER_6 = { id: 6, name: 'aeroplane', externalId: '843cb81d-03b9-07e1-5184-931c95265217', version: 6, createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: '', isPublic: false }
const CLASSIFIERS = [CLASSIFIER_1, CLASSIFIER_2, CLASSIFIER_3, CLASSIFIER_4, CLASSIFIER_5, CLASSIFIER_6]

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
  await models.Classifier.bulkCreate(CLASSIFIERS)
}

describe('GET /classifiers', () => {
  test('response is an array', async () => {
    const response = await request(app).get('/')

    expect(response.statusCode).toBe(200)
    expect(Array.isArray(response.body)).toBe(true)
  })

  test('response is sorted according to query', async () => {
    const query = {
      sort: 'name,version' // not defult filter
    }
    const response = await request(app).get('/').query(query)
    const { body } = response

    // manual filter, sort and pick
    const sortedClassifiers = _.chain(CLASSIFIERS)
      .filter((element) => element.isPublic === true || element.createdById === seedValues.primaryUserId)
      .map(classifier => {
        classifier.last_executed_at = null

        return _.pick(classifier, ['id', 'name', 'version'])
      })
      .orderBy(['name', 'version']) // non-default sort
      .value()

    expect(response.statusCode).toBe(200)
    expect(body).toEqual(sortedClassifiers)
  })

  test('response objects only have requested fields', async () => {
    const query = {
      fields: ['id', 'name', 'is_public', 'version']
    }
    const response = await request(app).get('/').query(query)
    const { body } = response

    // manual filter, sort and pick
    const sortedClassifiers = _.chain(CLASSIFIERS)
      .filter(element => element.isPublic === true || element.createdById === seedValues.primaryUserId)
      .orderBy(['name', 'version'], ['asc', 'desc']) // default filter
      .map(classifier => {
        classifier.last_executed_at = null
        classifier.is_public = classifier.isPublic

        return _.pick(classifier, ['id', 'name', 'is_public', 'version'])
      })
      .value()

    expect(response.statusCode).toBe(200)
    expect(body).toEqual(sortedClassifiers)
  })

  test('get public classifiers and created by the given user id (user public and private classifiers)', async () => {
    const response = await request(app).get('/')

    const filteredClassifiers = _.chain(CLASSIFIERS)
      .filter(element => element.isPublic === true || element.createdById === seedValues.primaryUserId)
      .value()

    expect(response.statusCode).toBe(200)
    expect(response.body).toHaveLength(filteredClassifiers.length)
  })

  test('set the limit and offset', async () => {
    const query = {
      limit: 1,
      offset: 2
    }

    const response = await request(app).get('/').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body).toHaveLength(1)
    expect(response.body[0].id).toEqual(1)
  })
})

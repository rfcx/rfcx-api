const request = require('supertest')
const moment = require('moment')
const routes = require('./classifier-deployments')
const models = require('../../_models')
const { expressApp, seedValues, truncateNonBase, muteConsole } = require('../../../common/testing/sequelize')

const app = expressApp()

app.use('/', routes)

beforeAll(() => {
  muteConsole('warn')
})

afterEach(async () => {
  await truncateNonBase(models)
})

afterAll(async () => {
  await models.sequelize.close()
})

beforeEach(async () => {
  await commonSetup()
})

const PROJECT_1 = { id: 'testproj0001', name: 'Test project 1', externalId: 1, createdById: seedValues.primaryUserId }
const PROJECT_2 = { id: 'testproj0002', name: 'Test project 2', externalId: 2, createdById: seedValues.otherUserId }
const PROJECTS = [PROJECT_1, PROJECT_2]

const STREAM_1 = { id: 'LilSjZJkRK43', name: 'Stream 1', projectId: PROJECT_1.id, externalId: 1, createdById: seedValues.primaryUserId }
const STREAM_2 = { id: 'LilSjZJkRK46', name: 'Stream 2', projectId: PROJECT_2.id, externalId: 2, isPublic: true, createdById: seedValues.otherUserId }
const STREAMS = [STREAM_1, STREAM_2]

const CLASSIFIER_1 = { id: 1, name: 'chainsaw', externalId: '843cb81d-03b9-07e1-5184-931c95265213', version: 1, createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: '', isPublic: true }
const CLASSIFIER_2 = { id: 2, name: 'dogbark', externalId: '843cb81d-03b9-07e1-5184-931c95265214', version: 5, createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: '', isPublic: false }
const CLASSIFIERS = [CLASSIFIER_1, CLASSIFIER_2]

const CLASSIFIER_DEPLOYMENT_1 = { id: 1, classifierId: CLASSIFIER_1.id, deployed: true, status: 10, start: '2022-06-29 11:22:37.094935', end: '2022-07-29 11:22:36.094935', createdById: seedValues.primaryUserId }
const CLASSIFIER_DEPLOYMENT_2 = { id: 2, classifierId: CLASSIFIER_2.id, deployed: true, status: 10, start: '2022-08-29 11:22:37.094935', end: '2022-09-29 11:22:37.094935', createdById: seedValues.primaryUserId }
const CLASSIFIER_DEPLOYMENTS = [CLASSIFIER_DEPLOYMENT_1, CLASSIFIER_DEPLOYMENT_2]

async function commonSetup () {
  await models.Project.bulkCreate(PROJECTS)
  await models.UserProjectRole.bulkCreate(PROJECTS.map(project => { return { project_id: project.id, user_id: project.createdById, role_id: seedValues.roleOwner } }))
  await models.Stream.bulkCreate(STREAMS)
  await models.Classifier.bulkCreate(CLASSIFIERS)
  await models.ClassifierDeployment.bulkCreate(CLASSIFIER_DEPLOYMENTS)
}

describe('GET /classifier-deployments', () => {
  describe('Valid', () => {
    test('Normal', async () => {
      const params = { }

      const response = await request(app).get(`/classifier-deployments`).query(params)
  
      expect(response.statusCode).toBe(200)
      expect(response.body.results.length).toBe(2)
    })

    test('with [`deployed`] params', async () => {
      const params = {
        deployed: false
      }

      const response = await request(app).get(`/classifier-deployments`).query(params)
  
      expect(response.statusCode).toBe(200)
      expect(response.body.results.length).toBe(0)
    })

    test('with [`start`] params', async () => {
      const params = {
        start: CLASSIFIER_DEPLOYMENT_1.end
      }

      const response = await request(app).get(`/classifier-deployments`).query(params)
  
      expect(response.statusCode).toBe(200)
      expect(response.body.results.length).toBe(1)
      expect(response.body.results[0].id).toBe(CLASSIFIER_DEPLOYMENT_2.id)
    })
  })
})

describe('GET /classifier-deployments/:id', () => {
  describe('Valid', () => {
    test('Normal', async () => {
      const params = { }

      const response = await request(app).get(`/classifier-deployments/${CLASSIFIER_DEPLOYMENT_1.id}`).query(params)
  
      expect(response.statusCode).toBe(200)
      expect(response.body.id).toBe(CLASSIFIER_DEPLOYMENT_1.id)
    })
  })
  describe('Invalid', () => {
    test('Not found', async () => {
      const params = { }

      const response = await request(app).get(`/classifier-deployments/12`).query(params)
  
      expect(response.statusCode).toBe(404)
    })
  })
})

describe('PATCH /classifier-deployments/:id', () => {
  describe('Valid', () => {
    test('Normal', async () => {
      const body = {
        deployed: false
      }

      const response = await request(app).patch(`/classifier-deployments/${CLASSIFIER_DEPLOYMENT_1.id}`).send(body)
  
      expect(response.statusCode).toBe(200)
      const deployment = await models.ClassifierDeployment.findByPk(CLASSIFIER_DEPLOYMENT_1.id)
      expect(deployment.deployed).toBe(body.deployed)
    })
  })
})

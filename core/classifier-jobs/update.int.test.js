const routes = require('./index')
const models = require('../_models')
const { migrate, truncate, expressApp, seed, seedValues, muteConsole } = require('../../common/testing/sequelize')
const request = require('supertest')
const CLASSIFIER_JOB_STATUS = require('./classifier-job-status')

// Test data
const CLASSIFIER_1 = { id: 555, name: 'sounds of the underground', version: 1, externalId: '555666', createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: '???', lastExecutedAt: null, isPublic: true }
const CLASSIFIERS = [CLASSIFIER_1]

const PROJECT_1 = { id: 'testproject1', name: 'Test project', createdById: seedValues.otherUserId }
const PROJECTS = [PROJECT_1]

const STREAM_1 = { id: 'LilSjZJkRK20', name: 'Test stream', start: '2021-01-02T01:00:00.000Z', end: '2021-01-02T05:00:00.000Z', isPublic: true, createdById: seedValues.otherUserId, projectId: PROJECT_1.id }
const STREAMS = [STREAM_1]

const JOB_WAITING = { id: 123, status: CLASSIFIER_JOB_STATUS.WAITING, classifierId: CLASSIFIER_1.id, projectId: PROJECT_1.id, queryStreams: 'Test stream, Test stream 2', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-09-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOB_RUNNING = { id: 124, status: CLASSIFIER_JOB_STATUS.RUNNING, classifierId: CLASSIFIER_1.id, projectId: PROJECT_1.id, queryStreams: 'Test stream, Test stream 2', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-09-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOB_DONE = { id: 125, status: CLASSIFIER_JOB_STATUS.DONE, classifierId: CLASSIFIER_1.id, projectId: PROJECT_1.id, queryStreams: 'Test stream, Test stream 2', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-09-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOBS = [JOB_WAITING, JOB_RUNNING, JOB_DONE]

async function seedTestData () {
  await models.Classifier.bulkCreate(CLASSIFIERS)
  await models.Project.bulkCreate(PROJECTS)
  await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: PROJECT_1.id, role_id: seedValues.roleMember })
  await models.UserProjectRole.create({ user_id: seedValues.anotherUserId, project_id: PROJECT_1.id, role_id: seedValues.roleGuest })
  await models.Stream.bulkCreate(STREAMS)
  await models.ClassifierJob.bulkCreate(JOBS)
}

beforeAll(async () => {
  await migrate(models.sequelize, models.Sequelize)
  await seed(models)
  muteConsole('warn')
})

beforeEach(async () => {
  await truncate(models)
  await seedTestData()
})

describe('PATCH /classifier-jobs/:id', () => {
  // Setup normal & super-user apps
  const app = expressApp().use('/', routes)
  const superUserApp = expressApp({ is_super: true }).use('/', routes)

  // Split valid & invalid target status
  const { RUNNING, ...VALID_STATUS_UPDATE } = CLASSIFIER_JOB_STATUS
  const { DONE, ...VALID_EXCEPT_DONE } = VALID_STATUS_UPDATE
  const INVALID_STATUS_UPDATE = { RUNNING }

  describe('valid usage', () => {
    test.each(Object.entries(VALID_STATUS_UPDATE))('can update status to %s (%s)', async (label, status) => {
      // Arrange
      const jobUpdate = { status }

      // Act
      const response1 = await request(superUserApp).patch(`/${JOB_WAITING.id}`).send(jobUpdate)
      const response2 = await request(superUserApp).patch(`/${JOB_RUNNING.id}`).send(jobUpdate)

      const jobUpdated1 = await models.ClassifierJob.findByPk(JOB_WAITING.id)
      const jobUpdated2 = await models.ClassifierJob.findByPk(JOB_RUNNING.id)

      // Assert
      expect(response1.statusCode).toBe(200)
      expect(response2.statusCode).toBe(200)
      expect(jobUpdated1.status).toBe(status)
      expect(jobUpdated2.status).toBe(status)
    })

    test(`sets completed_at when status becomes DONE (${CLASSIFIER_JOB_STATUS.DONE})`, async () => {
      // Arrange
      const jobUpdate = { status: CLASSIFIER_JOB_STATUS.DONE }

      // Act
      const response1 = await request(superUserApp).patch(`/${JOB_WAITING.id}`).send(jobUpdate)
      const response2 = await request(superUserApp).patch(`/${JOB_RUNNING.id}`).send(jobUpdate)

      const jobUpdated1 = await models.ClassifierJob.findByPk(JOB_WAITING.id)
      const jobUpdated2 = await models.ClassifierJob.findByPk(JOB_RUNNING.id)

      // Assert
      expect(response1.statusCode).toBe(200)
      expect(response2.statusCode).toBe(200)
      expect(jobUpdated1.completedAt).toBeTruthy()
      expect(jobUpdated2.completedAt).toBeTruthy()
    })

    test.each(Object.entries(VALID_EXCEPT_DONE))('clears completed_at when status becomes %s (%s)', async (label, status) => {
      // Arrange
      const jobUpdate = { status }

      // Act
      const response1 = await request(superUserApp).patch(`/${JOB_DONE.id}`).send(jobUpdate)
      const jobUpdated1 = await models.ClassifierJob.findByPk(JOB_DONE.id)

      // Assert
      expect(response1.statusCode).toBe(200)
      expect(jobUpdated1.completedAt).toBeNull()
    })
  })

  describe('invalid usage', () => {
    test.each(Object.entries(INVALID_STATUS_UPDATE))('400 if trying to update status to %s (%s)', async (label, status) => {
      // Arrange
      const jobUpdate = { status }

      // Act
      const response1 = await request(superUserApp).patch(`/${JOB_WAITING.id}`).send(jobUpdate)
      const response2 = await request(superUserApp).patch(`/${JOB_RUNNING.id}`).send(jobUpdate)

      const jobUpdated1 = await models.ClassifierJob.findByPk(JOB_WAITING.id)
      const jobUpdated2 = await models.ClassifierJob.findByPk(JOB_RUNNING.id)

      // Assert
      expect(response1.statusCode).toBe(400)
      expect(response2.statusCode).toBe(400)
      expect(jobUpdated1.status).toBe(JOB_WAITING.status)
      expect(jobUpdated2.status).toBe(JOB_RUNNING.status)
    })

    test('403 if not super user', async () => {
      // Arrange
      const jobUpdate = { status: CLASSIFIER_JOB_STATUS.DONE }

      // Act
      const response1 = await request(app).patch(`/${JOB_WAITING.id}`).send(jobUpdate)
      const response2 = await request(app).patch(`/${JOB_RUNNING.id}`).send(jobUpdate)

      const jobUpdated1 = await models.ClassifierJob.findByPk(JOB_WAITING.id)
      const jobUpdated2 = await models.ClassifierJob.findByPk(JOB_RUNNING.id)

      // Assert
      expect(response1.statusCode).toBe(403)
      expect(response2.statusCode).toBe(403)
      expect(jobUpdated1.status).toBe(JOB_WAITING.status)
      expect(jobUpdated2.status).toBe(JOB_RUNNING.status)
    })

    test('404 if classifier-job does not exist', async () => {
      // Arrange
      const notJobId = 10000
      const notJob = await models.ClassifierJob.findByPk(notJobId)
      expect(notJob).toBeNull() // Pre-condition: Job does not exist

      const jobUpdate = { status: CLASSIFIER_JOB_STATUS.DONE }

      // Act
      const response1 = await request(superUserApp).patch(`/${notJobId}`).send(jobUpdate)

      // Assert
      expect(response1.statusCode).toBe(404)
    })
  })
})

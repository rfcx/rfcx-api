const routes = require('./index')
const models = require('../_models')
const { migrate, truncate, expressApp, seed, seedValues, muteConsole } = require('../../common/testing/sequelize')
const request = require('supertest')
const CLASSIFIER_JOB_STATUS = require('./classifier-job-status')
const { WAITING, RUNNING, DONE, CANCELLED, ERROR } = require('./classifier-job-status')

// Test data
const CLASSIFIER_1 = { id: 555, name: 'sounds of the underground', version: 1, externalId: '555666', createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: '???', lastExecutedAt: null, isPublic: true }
const CLASSIFIERS = [CLASSIFIER_1]

const PROJECT_1 = { id: 'testproject1', name: 'Test project', createdById: seedValues.otherUserId }
const PROJECTS = [PROJECT_1]

const STREAM_1 = { id: 'LilSjZJkRK20', name: 'Test stream', start: '2021-01-02T01:00:00.000Z', end: '2021-01-02T05:00:00.000Z', isPublic: true, createdById: seedValues.otherUserId, projectId: PROJECT_1.id }
const STREAMS = [STREAM_1]

const JOB_WAITING = { id: 123, status: WAITING, classifierId: CLASSIFIER_1.id, projectId: PROJECT_1.id, queryStreams: 'Test stream, Test stream 2', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-09-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOB_RUNNING = { id: 124, status: RUNNING, classifierId: CLASSIFIER_1.id, projectId: PROJECT_1.id, queryStreams: 'Test stream, Test stream 2', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-09-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOB_DONE = { id: 125, status: DONE, classifierId: CLASSIFIER_1.id, projectId: PROJECT_1.id, queryStreams: 'Test stream, Test stream 2', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-09-07T08:07:49.158Z', startedAt: null, completedAt: '2022-10-03T09:03:00.000Z' }
const JOB_ERROR = { id: 126, status: ERROR, classifierId: CLASSIFIER_1.id, projectId: PROJECT_1.id, queryStreams: 'Test stream, Test stream 2', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-09-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOB_CANCELLED = { id: 127, status: CANCELLED, classifierId: CLASSIFIER_1.id, projectId: PROJECT_1.id, queryStreams: 'Test stream, Test stream 2', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-09-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOBS = [JOB_WAITING, JOB_RUNNING, JOB_DONE, JOB_ERROR, JOB_CANCELLED]

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
  const hasPermissionApp = expressApp({ id: seedValues.otherUserId }).use('/', routes)
  const noPermissionApp = expressApp({ id: seedValues.anotherUserId }).use('/', routes)
  const superUserApp = expressApp({ is_super: true }).use('/', routes)
  const allApps = { hasPermissionApp, noPermissionApp, superUserApp }

  // Split valid & invalid target status
  const { RUNNING, ...STATUS_EXCEPT_RUNNING } = CLASSIFIER_JOB_STATUS
  const HAS_PERMISSION_VALID_TARGET_STATUS = { CANCELLED, WAITING }
  const HAS_PERMISSION_INVALID_TARGET_STATUS = { DONE }
  const CLEAR_COMPLETE_AT_STATUS = { WAITING, ERROR }

  describe('valid usage', () => {
    test.each(Object.entries(STATUS_EXCEPT_RUNNING))('super user can update status to %s (%s)', async (label, status) => {
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

    test.each(Object.entries(HAS_PERMISSION_VALID_TARGET_STATUS))('has permission user can update status to %s (%s)', async (label, status) => {
      // Arrange
      const jobUpdate = { status }

      // Act
      const response1 = await request(hasPermissionApp).patch(`/${JOB_WAITING.id}`).send(jobUpdate)
      const response2 = await request(hasPermissionApp).patch(`/${JOB_ERROR.id}`).send(jobUpdate)
      const response3 = await request(hasPermissionApp).patch(`/${JOB_CANCELLED.id}`).send(jobUpdate)

      const jobUpdated1 = await models.ClassifierJob.findByPk(JOB_WAITING.id)
      const jobUpdated2 = await models.ClassifierJob.findByPk(JOB_ERROR.id)
      const jobUpdated3 = await models.ClassifierJob.findByPk(JOB_CANCELLED.id)

      // Assert
      expect(response1.statusCode).toBe(200)
      expect(response2.statusCode).toBe(200)
      expect(response3.statusCode).toBe(200)
      expect(jobUpdated1.status).toBe(status)
      expect(jobUpdated2.status).toBe(status)
      expect(jobUpdated3.status).toBe(status)
    })

    test('can update status to CANCELLED (50) from WAITING (0)', async () => {
      // Arrange
      const jobUpdate = { status: CANCELLED }

      // Act
      const response = await request(superUserApp).patch(`/${JOB_WAITING.id}`).send(jobUpdate)

      const jobUpdated = await models.ClassifierJob.findByPk(JOB_WAITING.id)

      // Assert
      expect(response.statusCode).toBe(200)
      expect(jobUpdated.status).toBe(CANCELLED)
    })

    test(`sets completed_at when status becomes DONE (${DONE})`, async () => {
      // Arrange
      const jobUpdate = { status: DONE }

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

    test.each(Object.entries(CLEAR_COMPLETE_AT_STATUS))('clears completed_at when status becomes %s (%s)', async (label, status) => {
      // Arrange
      const jobUpdate = { status }

      // Act
      const response1 = await request(superUserApp).patch(`/${JOB_DONE.id}`).send(jobUpdate)
      const jobUpdated1 = await models.ClassifierJob.findByPk(JOB_DONE.id)

      // Assert
      expect(response1.statusCode).toBe(200)
      expect(jobUpdated1.completedAt).toBeNull()
    })

    test('leaves completed_at unchanged when status unchanged', async () => {
      // Arrange
      const jobUpdate = {}

      // Act
      const response1 = await request(superUserApp).patch(`/${JOB_WAITING.id}`).send(jobUpdate)
      const response2 = await request(superUserApp).patch(`/${JOB_RUNNING.id}`).send(jobUpdate)
      const response3 = await request(superUserApp).patch(`/${JOB_DONE.id}`).send(jobUpdate)

      const jobUpdated1 = await models.ClassifierJob.findByPk(JOB_WAITING.id, { raw: true })
      const jobUpdated2 = await models.ClassifierJob.findByPk(JOB_RUNNING.id, { raw: true })
      const jobUpdated3 = await models.ClassifierJob.findByPk(JOB_DONE.id, { raw: true })

      // Assert
      expect(response1.statusCode).toBe(200)
      expect(response2.statusCode).toBe(200)
      expect(response3.statusCode).toBe(200)
      // TODO - Find a better way to compare Date|null
      expect(new Date(jobUpdated1.completedAt)).toEqual(new Date(JOB_WAITING.completedAt))
      expect(new Date(jobUpdated2.completedAt)).toEqual(new Date(JOB_RUNNING.completedAt))
      expect(new Date(jobUpdated3.completedAt)).toEqual(new Date(JOB_DONE.completedAt))
    })
  })

  describe('invalid usage', () => {
    test.each(Object.entries(allApps))('400 if trying to update status with %s to RUNNING (20)', async (label, app) => {
      // Arrange
      const jobUpdate = { status: RUNNING }

      // Act
      const response1 = await request(app).patch(`/${JOB_WAITING.id}`).send(jobUpdate)
      const response2 = await request(app).patch(`/${JOB_RUNNING.id}`).send(jobUpdate)

      const jobUpdated1 = await models.ClassifierJob.findByPk(JOB_WAITING.id)
      const jobUpdated2 = await models.ClassifierJob.findByPk(JOB_RUNNING.id)

      // Assert
      expect(response1.statusCode).toBe(400)
      expect(response2.statusCode).toBe(400)
      expect(jobUpdated1.status).toBe(JOB_WAITING.status)
      expect(jobUpdated2.status).toBe(JOB_RUNNING.status)
    })

    test.each(Object.entries(HAS_PERMISSION_INVALID_TARGET_STATUS))('400 if has permission user update status to %s (%s)', async (label, status) => {
      // Arrange
      const jobUpdate = { status }

      // Act
      const response1 = await request(hasPermissionApp).patch(`/${JOB_WAITING.id}`).send(jobUpdate)
      const response2 = await request(hasPermissionApp).patch(`/${JOB_ERROR.id}`).send(jobUpdate)
      const response3 = await request(hasPermissionApp).patch(`/${JOB_CANCELLED.id}`).send(jobUpdate)

      const jobUpdated1 = await models.ClassifierJob.findByPk(JOB_WAITING.id)
      const jobUpdated2 = await models.ClassifierJob.findByPk(JOB_ERROR.id)
      const jobUpdated3 = await models.ClassifierJob.findByPk(JOB_CANCELLED.id)

      expect(response1.statusCode).toBe(400)
      expect(response2.statusCode).toBe(400)
      expect(response3.statusCode).toBe(400)
      expect(jobUpdated1.status).toBe(WAITING)
      expect(jobUpdated2.status).toBe(ERROR)
      expect(jobUpdated3.status).toBe(CANCELLED)
    })

    test.each(Object.entries(STATUS_EXCEPT_RUNNING))('403 if no permission user update status to %s (%s)', async (label, status) => {
      // Arrange
      const jobUpdate = { status }

      // Act
      const response1 = await request(noPermissionApp).patch(`/${JOB_WAITING.id}`).send(jobUpdate)
      const response2 = await request(noPermissionApp).patch(`/${JOB_RUNNING.id}`).send(jobUpdate)

      const jobUpdated1 = await models.ClassifierJob.findByPk(JOB_WAITING.id)
      const jobUpdated2 = await models.ClassifierJob.findByPk(JOB_RUNNING.id)

      // Assert
      expect(response1.statusCode).toBe(403)
      expect(response2.statusCode).toBe(403)
      expect(jobUpdated1.status).toBe(WAITING)
      expect(jobUpdated2.status).toBe(RUNNING)
    })

    test('404 if classifier-job does not exist', async () => {
      // Arrange
      const notJobId = 10000
      const notJob = await models.ClassifierJob.findByPk(notJobId)
      expect(notJob).toBeNull() // Pre-condition: Job does not exist

      const jobUpdate = { status: DONE }

      // Act
      const response1 = await request(superUserApp).patch(`/${notJobId}`).send(jobUpdate)

      // Assert
      expect(response1.statusCode).toBe(404)
    })
  })
})

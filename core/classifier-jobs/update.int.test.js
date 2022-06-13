const routes = require('./index')
const models = require('../_models')
const { migrate, truncate, expressApp, seed, seedValues } = require('../../common/testing/sequelize')
const request = require('supertest')
const CLASSIFIER_JOB_STATUS = require('./classifier-job-status')

// Test data
const PROJECT_1 = { id: 'testproject1', name: 'Test project', createdById: seedValues.otherUserId }
const PROJECTS = [PROJECT_1]

const STREAM_1 = { id: 'LilSjZJkRK20', name: 'Test stream', start: '2021-01-02T01:00:00.000Z', end: '2021-01-02T05:00:00.000Z', isPublic: true, createdById: seedValues.otherUserId, projectId: PROJECT_1.id }
const STREAMS = [STREAM_1]

const JOB_WAITING = { id: 123, status: CLASSIFIER_JOB_STATUS.WAITING, projectId: PROJECT_1.id, queryStreams: 'Test stream, Test stream 2', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-09-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOB_RUNNING = { id: 124, status: CLASSIFIER_JOB_STATUS.RUNNING, projectId: PROJECT_1.id, queryStreams: 'Test stream, Test stream 2', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-09-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOB_DONE = { id: 125, status: CLASSIFIER_JOB_STATUS.DONE, projectId: PROJECT_1.id, queryStreams: 'Test stream, Test stream 2', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-09-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOBS = [JOB_WAITING, JOB_RUNNING, JOB_DONE]

async function seedTestData () {
  // Projects & users
  await models.Project.bulkCreate(PROJECTS)
  await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: PROJECT_1.id, role_id: seedValues.roleMember })
  await models.UserProjectRole.create({ user_id: seedValues.anotherUserId, project_id: PROJECT_1.id, role_id: seedValues.roleGuest })

  // Streams
  await models.Stream.bulkCreate(STREAMS)

  // Jobs
  await models.ClassifierJob.bulkCreate(JOBS)
}

beforeAll(async () => {
  await migrate(models.sequelize, models.Sequelize)
  await seed(models)
})

beforeEach(async () => {
  await truncate(models)
  await seedTestData()
})

describe('PATCH /classifier-jobs/:id', () => {
  const app = expressApp().use('/', routes)
  const superUserApp = expressApp({ is_super: true }).use('/', routes)

  // Split valid & invalid target status
  const { RUNNING, ...VALID_STATUS_UPDATE_OBJ } = CLASSIFIER_JOB_STATUS
  const INVALID_STATUS_UPDATE = [RUNNING]
  const VALID_STATUS_UPDATE = Object.values(VALID_STATUS_UPDATE_OBJ)

  describe('valid usage', () => {
    test.each(VALID_STATUS_UPDATE)('can update status to %s', async (status) => {
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

    test('sets completed_at when status becomes DONE', async () => {
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
  })

  describe('invalid usage', () => {
    test.each(INVALID_STATUS_UPDATE)('cannot update status to %s', async (status) => {
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

    test('normal user cannot update', async () => {
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
  })
})

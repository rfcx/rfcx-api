const routes = require('./index')
const models = require('../_models')
const { truncateNonBase, expressApp, seedValues, muteConsole } = require('../../common/testing/sequelize')
const request = require('supertest')
const CLASSIFIER_JOB_STATUS = require('./classifier-job-status')
const { WAITING, RUNNING, DONE, CANCELLED, ERROR } = require('./classifier-job-status')

// Test data
const CLASSIFIER_1 = { id: 831, name: 'sounds of the underground', version: 1, externalId: '555666', createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: '???', lastExecutedAt: null, isPublic: true }
const CLASSIFIERS = [CLASSIFIER_1]

const CLASSIFICATION_1 = { id: 232, value: 'chainsaw', title: 'Chainsaw', typeId: 1, source_id: 1 }
const CLASSIFICATION_2 = { id: 233, value: 'vehicle', title: 'Vehicle', typeId: 1, source_id: 1 }
const CLASSIFICATION_3 = { id: 234, value: 'gunshot', title: 'Gunshot', typeId: 1, source_id: 1 }
const CLASSIFICATION_4 = { id: 235, value: 'aircraft', title: 'Aircraft', typeId: 1, source_id: 1 }
const CLASSIFICATIONS = [CLASSIFICATION_1, CLASSIFICATION_2, CLASSIFICATION_3, CLASSIFICATION_4]

const CLASSIFIER_OUTPUT_1 = { id: 100, classifierId: CLASSIFIER_1.id, classificationId: CLASSIFICATION_1.id, outputClassName: `${CLASSIFICATION_1.value}_custom`, ignoreThreshold: 0.5 }
const CLASSIFIER_OUTPUT_2 = { id: 101, classifierId: CLASSIFIER_1.id, classificationId: CLASSIFICATION_2.id, outputClassName: `${CLASSIFICATION_2}_custom`, ignoreThreshold: 0.5 }
const CLASSIFIER_OUTPUT_3 = { id: 102, classifierId: CLASSIFIER_1.id, classificationId: CLASSIFICATION_3.id, outputClassName: `${CLASSIFICATION_3}_custom`, ignoreThreshold: 0.5 }
const CLASSIFIER_OUTPUT_4 = { id: 104, classifierId: CLASSIFIER_1.id, classificationId: CLASSIFICATION_4.id, outputClassName: `${CLASSIFICATION_4}_custom`, ignoreThreshold: 0.5 }
const CLASSIFIER_OUTPUTS = [CLASSIFIER_OUTPUT_1, CLASSIFIER_OUTPUT_2, CLASSIFIER_OUTPUT_3, CLASSIFIER_OUTPUT_4]

const PROJECT_1 = { id: 'testprojert1', name: 'Test project', createdById: seedValues.otherUserId }
const PROJECTS = [PROJECT_1]

const ROLE_1 = { user_id: seedValues.primaryUserId, project_id: PROJECT_1.id, role_id: seedValues.roleMember }
const ROLE_2 = { user_id: seedValues.anotherUserId, project_id: PROJECT_1.id, role_id: seedValues.roleGuest }
const ROLES = [ROLE_1, ROLE_2]

const STREAM_1 = { id: 'LilSjZJkRK00', name: 'Test stream', start: '2021-01-02T01:00:00.000Z', end: '2021-01-02T05:00:00.000Z', isPublic: true, createdById: seedValues.otherUserId, projectId: PROJECT_1.id }
const STREAMS = [STREAM_1]

const JOB_WAITING = { id: 123, status: WAITING, classifierId: CLASSIFIER_1.id, projectId: PROJECT_1.id, queryStreams: 'Test stream, Test stream 2', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-09-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOB_RUNNING = { id: 124, status: RUNNING, classifierId: CLASSIFIER_1.id, projectId: PROJECT_1.id, queryStreams: 'Test stream, Test stream 2', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-09-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOB_DONE = { id: 125, status: DONE, classifierId: CLASSIFIER_1.id, projectId: PROJECT_1.id, queryStreams: 'Test stream, Test stream 2', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-09-07T08:07:49.158Z', startedAt: null, completedAt: '2022-10-03T09:03:00.000Z' }
const JOB_ERROR = { id: 126, status: ERROR, classifierId: CLASSIFIER_1.id, projectId: PROJECT_1.id, queryStreams: 'Test stream, Test stream 2', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-09-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOB_CANCELLED = { id: 127, status: CANCELLED, classifierId: CLASSIFIER_1.id, projectId: PROJECT_1.id, queryStreams: 'Test stream, Test stream 2', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-09-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOBS = [JOB_WAITING, JOB_RUNNING, JOB_DONE, JOB_ERROR, JOB_CANCELLED]

const CLASSIFIER_JOB_WAITING_STREAM = { classifierJobId: JOB_WAITING.id, streamId: STREAM_1.id }
const CLASSIFIER_JOB_RUNNING_STREAM = { classifierJobId: JOB_RUNNING.id, streamId: STREAM_1.id }
const CLASSIFIER_JOB_DONE_STREAM = { classifierJobId: JOB_DONE.id, streamId: STREAM_1.id }
const CLASSIFIER_JOB_ERROR_STREAM = { classifierJobId: JOB_ERROR.id, streamId: STREAM_1.id }
const CLASSIFIER_JOB_CANCELLED_STREAM = { classifierJobId: JOB_CANCELLED.id, streamId: STREAM_1.id }
const CLASSIFIER_JOB_STREAMS = [CLASSIFIER_JOB_WAITING_STREAM, CLASSIFIER_JOB_RUNNING_STREAM, CLASSIFIER_JOB_DONE_STREAM, CLASSIFIER_JOB_ERROR_STREAM, CLASSIFIER_JOB_CANCELLED_STREAM]

async function seedTestData () {
  await models.Project.bulkCreate(PROJECTS)
  await models.UserProjectRole.bulkCreate(ROLES)
  await models.Stream.bulkCreate(STREAMS)
  await models.Classification.bulkCreate(CLASSIFICATIONS)
  await models.Classifier.bulkCreate(CLASSIFIERS)
  await models.ClassifierOutput.bulkCreate(CLASSIFIER_OUTPUTS)
  await models.ClassifierJob.bulkCreate(JOBS)
  await models.ClassifierJobStream.bulkCreate(CLASSIFIER_JOB_STREAMS)
}

beforeAll(async () => {
  muteConsole('warn')
})

beforeEach(async () => {
  await seedTestData()
})

afterEach(async () => {
  await truncateNonBase(models)
})

afterAll(async () => {
  await models.sequelize.close()
})

describe('PATCH /classifier-jobs/:id', () => {
  // Setup normal & super-user apps
  const hasPermissionApp = expressApp({ id: seedValues.otherUserId }).use('/', routes)
  const noPermissionApp = expressApp({ id: seedValues.anotherUserId }).use('/', routes)
  const superUserApp = expressApp({ is_super: true }).use('/', routes)

  // Split valid & invalid target status
  const { RUNNING, ...STATUS_EXCEPT_RUNNING } = CLASSIFIER_JOB_STATUS
  const CLEAR_COMPLETE_AT_STATUS = { WAITING, ERROR }

  const ALLOWED_SOURCE_STATUS_JOBS = { JOB_WAITING, JOB_ERROR, JOB_CANCELLED }
  const NOT_ALLOWED_SOURCE_STATUS_JOBS = { JOB_RUNNING, JOB_DONE }

  describe('valid usage', () => {
    describe('superuser', () => {
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
        const response = await request(superUserApp).patch(`/${JOB_DONE.id}`).send(jobUpdate)
        const jobUpdated = await models.ClassifierJob.findByPk(JOB_DONE.id)

        // Assert
        expect(response.statusCode).toBe(200)
        expect(jobUpdated.completedAt).toBeNull()
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

      test('can update minutes_total', async () => {
        // Arrange
        const jobUpdate = { minutes_total: 50 }

        // Act
        const response = await request(superUserApp).patch(`/${JOB_RUNNING.id}`).send(jobUpdate)
        const jobUpdated = await models.ClassifierJob.findByPk(JOB_RUNNING.id)

        // Assert
        expect(response.statusCode).toBe(200)
        expect(jobUpdated.minutesTotal).toBe(jobUpdate.minutes_total)
      })
    })

    describe('has permission user', () => {
      test.each(Object.entries(ALLOWED_SOURCE_STATUS_JOBS))('has permission user can update status to CANCELLED (50) from %s', async (label, job) => {
        // Arrange
        const jobUpdate = { status: CANCELLED }

        // Act
        const response1 = await request(hasPermissionApp).patch(`/${job.id}`).send(jobUpdate)
        const jobUpdated1 = await models.ClassifierJob.findByPk(job.id)

        // Assert
        expect(response1.statusCode).toBe(200)
        expect(jobUpdated1.status).toBe(CANCELLED)
      })

      test.each(Object.entries(ALLOWED_SOURCE_STATUS_JOBS))('has permission user can update status to WAITING (20) from %s', async (label, job) => {
        // Arrange
        const jobUpdate = { status: WAITING }

        // Act
        const response = await request(hasPermissionApp).patch(`/${job.id}`).send(jobUpdate)
        const jobUpdated = await models.ClassifierJob.findByPk(job.id)

        // Assert
        expect(response.statusCode).toBe(200)
        expect(jobUpdated.status).toBe(WAITING)
      })
    })

    test('calculates and saves classifier-job-summary after changing status to DONE', async () => {
      // Arrange
      const jobUpdate = { status: DONE }

      await models.Detection.create({ classifierJobId: JOB_RUNNING.id, streamId: STREAM_1.id, classificationId: CLASSIFICATION_1.id, classifierId: CLASSIFIER_1.id, start: '2022-01-01T00:00:00.000Z', end: '2022-01-01T00:00:01.000Z', confidence: 0.99 })
      await models.Detection.create({ classifierJobId: JOB_RUNNING.id, streamId: STREAM_1.id, classificationId: CLASSIFICATION_2.id, classifierId: CLASSIFIER_1.id, start: '2022-01-01T00:00:00.000Z', end: '2022-01-01T00:00:01.000Z', confidence: 0.99 })
      await models.Detection.create({ classifierJobId: JOB_RUNNING.id, streamId: STREAM_1.id, classificationId: CLASSIFICATION_3.id, classifierId: CLASSIFIER_1.id, start: '2022-01-01T00:00:00.000Z', end: '2022-01-01T00:00:01.000Z', confidence: 0.000001 })
      await models.Detection.create({ classifierJobId: JOB_DONE.id, streamId: STREAM_1.id, classificationId: CLASSIFICATION_1.id, classifierId: CLASSIFIER_1.id, start: '2022-01-01T00:00:00.000Z', end: '2022-01-01T00:00:01.000Z', confidence: 0.99 })
      await models.Detection.create({ streamId: STREAM_1.id, classificationId: CLASSIFICATION_3.id, classifierId: CLASSIFIER_1.id, start: '2022-01-01T00:00:00.000Z', end: '2022-01-01T00:00:01.000Z', confidence: 0.99 })

      expect((await models.ClassifierJobSummary.findAll()).length).toBe(0)
      // Act
      const response = await request(superUserApp).patch(`/${JOB_RUNNING.id}`).send(jobUpdate)
      const jobUpdated = await models.ClassifierJob.findByPk(JOB_RUNNING.id)

      const classifierJobSummaries = (await models.ClassifierJobSummary.findAll()).sort((a, b) => a.classificationId < b.classificationId)
      // Assert
      expect(response.statusCode).toBe(200)
      expect(jobUpdated.status).toBe(DONE)
      expect(classifierJobSummaries.length).toBe(4)
      expect(classifierJobSummaries[0].classifierJobId).toBe(JOB_RUNNING.id)
      expect(classifierJobSummaries[0].classificationId).toBe(CLASSIFICATION_1.id)
      expect(classifierJobSummaries[0].total).toBe(1)
      expect(classifierJobSummaries[0].confirmed).toBe(0)
      expect(classifierJobSummaries[0].rejected).toBe(0)
      expect(classifierJobSummaries[0].uncertain).toBe(0)
      expect(classifierJobSummaries[1].classifierJobId).toBe(JOB_RUNNING.id)
      expect(classifierJobSummaries[1].classificationId).toBe(CLASSIFICATION_2.id)
      expect(classifierJobSummaries[1].total).toBe(1)
      expect(classifierJobSummaries[1].confirmed).toBe(0)
      expect(classifierJobSummaries[1].rejected).toBe(0)
      expect(classifierJobSummaries[1].uncertain).toBe(0)
      expect(classifierJobSummaries[2].classifierJobId).toBe(JOB_RUNNING.id)
      expect(classifierJobSummaries[2].classificationId).toBe(CLASSIFICATION_3.id)
      expect(classifierJobSummaries[2].total).toBe(1)
      expect(classifierJobSummaries[2].confirmed).toBe(0)
      expect(classifierJobSummaries[2].rejected).toBe(0)
      expect(classifierJobSummaries[2].uncertain).toBe(0)
      expect(classifierJobSummaries[3].classifierJobId).toBe(JOB_RUNNING.id)
      expect(classifierJobSummaries[3].classificationId).toBe(CLASSIFICATION_4.id)
      expect(classifierJobSummaries[3].total).toBe(0)
      expect(classifierJobSummaries[3].confirmed).toBe(0)
      expect(classifierJobSummaries[3].rejected).toBe(0)
      expect(classifierJobSummaries[3].uncertain).toBe(0)
    })
  })

  describe('invalid usage', () => {
    describe('general', () => {
      test('400 if trying to update status with hasPermissionApp to RUNNING (20)', async () => {
        // Arrange
        const jobUpdate = { status: RUNNING }

        // Act
        const response1 = await request(hasPermissionApp).patch(`/${JOB_WAITING.id}`).send(jobUpdate)
        const response2 = await request(hasPermissionApp).patch(`/${JOB_RUNNING.id}`).send(jobUpdate)

        const jobUpdated1 = await models.ClassifierJob.findByPk(JOB_WAITING.id)
        const jobUpdated2 = await models.ClassifierJob.findByPk(JOB_RUNNING.id)

        // Assert
        expect(response1.statusCode).toBe(400)
        expect(response2.statusCode).toBe(400)
        expect(jobUpdated1.status).toBe(JOB_WAITING.status)
        expect(jobUpdated2.status).toBe(JOB_RUNNING.status)
      })
      test('400 if trying to update status with noPermissionApp to RUNNING (20)', async () => {
        // Arrange
        const jobUpdate = { status: RUNNING }

        // Act
        const response1 = await request(noPermissionApp).patch(`/${JOB_WAITING.id}`).send(jobUpdate)
        const response2 = await request(noPermissionApp).patch(`/${JOB_RUNNING.id}`).send(jobUpdate)

        const jobUpdated1 = await models.ClassifierJob.findByPk(JOB_WAITING.id)
        const jobUpdated2 = await models.ClassifierJob.findByPk(JOB_RUNNING.id)

        // Assert
        expect(response1.statusCode).toBe(400)
        expect(response2.statusCode).toBe(400)
        expect(jobUpdated1.status).toBe(JOB_WAITING.status)
        expect(jobUpdated2.status).toBe(JOB_RUNNING.status)
      })
      test('400 if trying to update status with superUserApp to RUNNING (20)', async () => {
        // Arrange
        const jobUpdate = { status: RUNNING }

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

      test('400 if minutes_total is a string', async () => {
        // Arrange
        const jobUpdate = { minutes_total: 'xx' }

        // Act
        const response = await request(superUserApp).patch(`/${JOB_RUNNING.id}`).send(jobUpdate)

        // Assert
        expect(response.statusCode).toBe(400)
      })

      test('400 if minutes_total is a boolean', async () => {
        // Arrange
        const jobUpdate = { minutes_total: true }

        // Act
        const response = await request(superUserApp).patch(`/${JOB_RUNNING.id}`).send(jobUpdate)

        // Assert
        expect(response.statusCode).toBe(400)
      })

      test('404 if classifier-job does not exist', async () => {
        // Arrange
        const notJobId = 10000
        const notJob = await models.ClassifierJob.findByPk(notJobId)
        expect(notJob).toBeNull() // Pre-condition: Job does not exist

        const jobUpdate = { status: DONE }

        // Act
        const response = await request(superUserApp).patch(`/${notJobId}`).send(jobUpdate)

        // Assert
        expect(response.statusCode).toBe(404)
      })
    })
    describe('has permission user', () => {
      test.each(Object.entries(NOT_ALLOWED_SOURCE_STATUS_JOBS))('400 if has permission user update status to CANCELLED (50) from %s', async (label, job) => {
        // Arrange
        const jobUpdate = { status: CANCELLED }

        // Act
        const response = await request(hasPermissionApp).patch(`/${job.id}`).send(jobUpdate)
        const jobUpdated = await models.ClassifierJob.findByPk(job.id)

        // Assert
        expect(response.statusCode).toBe(400)
        expect(jobUpdated.status).toBe(job.status)
      })

      test.each(Object.entries(NOT_ALLOWED_SOURCE_STATUS_JOBS))('400 if has permission user update status to WAITING (20) from %s', async (label, job) => {
        // Arrange
        const jobUpdate = { status: WAITING }

        // Act
        const response = await request(hasPermissionApp).patch(`/${job.id}`).send(jobUpdate)
        const jobUpdated = await models.ClassifierJob.findByPk(job.id)

        // Assert
        expect(response.statusCode).toBe(400)
        expect(jobUpdated.status).toBe(job.status)
      })

      test.each(Object.entries(ALLOWED_SOURCE_STATUS_JOBS))('400 if has permission user update status to DONE (30) from %s', async (label, job) => {
        // Arrange
        const jobUpdate = { status: DONE }

        // Act
        const response = await request(hasPermissionApp).patch(`/${job.id}`).send(jobUpdate)
        const jobUpdated = await models.ClassifierJob.findByPk(job.id)

        expect(response.statusCode).toBe(400)
        expect(jobUpdated.status).toBe(job.status)
      })
    })
  })
})

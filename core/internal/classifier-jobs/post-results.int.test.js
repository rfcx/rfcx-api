const routes = require('./index')
const models = require('../../_models')
const { migrate, truncate, expressApp, seed, seedValues, muteConsole } = require('../../../common/testing/sequelize')
const request = require('supertest')
const CLASSIFIER_JOB_STATUS = require('../../classifier-jobs/classifier-job-status')

// Test data
const CLASSIFICATION_1 = { id: 100001, value: 'aureus', title: 'Canis aureus', typeId: 1 }
const CLASSIFICATION_2 = { id: 100002, value: 'corrugatus', title: 'Aceros corrugatus', typeId: 1 }
const CLASSIFICATIONS = [CLASSIFICATION_1, CLASSIFICATION_2]

const CLASSIFIER_1 = { id: 555, name: 'sounds of the underground', version: 1, externalId: '555666', createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: '???', lastExecutedAt: null, isPublic: true }
const CLASSIFIERS = [CLASSIFIER_1]

const CLASSIFIER_OUTPUT_1 = { id: 5551, classifierId: CLASSIFIER_1.id, classificationId: CLASSIFICATION_1.id, outputClassName: `el-${CLASSIFICATION_1.value}` }
const CLASSIFIER_OUTPUT_2 = { id: 5552, classifierId: CLASSIFIER_1.id, classificationId: CLASSIFICATION_2.id, outputClassName: `el-${CLASSIFICATION_2.value}` }
const CLASSIFIER_OUTPUTS = [CLASSIFIER_OUTPUT_1, CLASSIFIER_OUTPUT_2]

const PROJECT_1 = { id: 'testproject1', name: 'Test project', createdById: seedValues.otherUserId }
const PROJECTS = [PROJECT_1]

const STREAM_1 = { id: 'LilSjZJkRK20', name: 'Test stream', start: '2021-01-02T01:00:00.000Z', end: '2021-01-02T05:00:00.000Z', isPublic: true, createdById: seedValues.otherUserId, projectId: PROJECT_1.id }
const STREAMS = [STREAM_1]

const JOB_RUNNING = { id: 123, status: CLASSIFIER_JOB_STATUS.RUNNING, classifierId: CLASSIFIER_1.id, projectId: PROJECT_1.id, queryStreams: 'Test*', queryStart: '2021-01-01', queryEnd: '2022-01-01', queryHours: '1,2', createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-09-07T08:07:49.158Z', startedAt: '2022-09-07T08:07:49.158Z', completedAt: null }
const JOBS = [JOB_RUNNING]

async function seedTestData () {
  await models.Classification.bulkCreate(CLASSIFICATIONS)
  await models.Classifier.bulkCreate(CLASSIFIERS)
  await models.ClassifierOutput.bulkCreate(CLASSIFIER_OUTPUTS)
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

describe('POST /internal/classifier-jobs/:id/results', () => {
  // Setup normal & super-user apps
  const app = expressApp().use('/', routes)
  const superUserApp = expressApp({ is_super: true }).use('/', routes)

  const VALID_JOB_RESULT = {
    analyzedMinutes: 5_000,
    detections: [{
      streamId: STREAM_1.id,
      classifier: JOB_RUNNING.classifierId,
      classification: CLASSIFIER_OUTPUT_1.outputClassName,
      start: '2021-01-02T01:32:07.000Z',
      end: '2021-01-02T01:32:09.000Z',
      confidence: 0.975123
    }, {
      streamId: STREAM_1.id,
      classifier: JOB_RUNNING.classifierId,
      classification: CLASSIFIER_OUTPUT_2.outputClassName,
      start: '2021-01-02T01:33:49.000Z',
      end: '2021-01-02T01:33:50.000Z',
      confidence: 0.921955
    }]
  }

  describe('valid usage', () => {
    test('201 on success', async () => {
      // Act
      const response1 = await request(superUserApp).post(`/${JOB_RUNNING.id}/results`).send(VALID_JOB_RESULT)

      // Assert
      expect(response1.statusCode).toBe(201)
    })

    test('saves analyzed minutes', async () => {
      // Arrange
      const result1 = { ...VALID_JOB_RESULT, analyzedMinutes: 15_000, detections: [] }
      const result2 = { ...VALID_JOB_RESULT, analyzedMinutes: 25_000, detections: [] }

      // Act
      const response1 = await request(superUserApp).post(`/${JOB_RUNNING.id}/results`).send(result1)
      const job1 = await models.ClassifierJob.findByPk(JOB_RUNNING.id)
      const response2 = await request(superUserApp).post(`/${JOB_RUNNING.id}/results`).send(result2)
      const job2 = await models.ClassifierJob.findByPk(JOB_RUNNING.id)

      // Assert
      expect(response1.statusCode).toBe(201)
      expect(response2.statusCode).toBe(201)
      expect(job1.minutesCompleted).toBe(result1.analyzedMinutes)
      expect(job2.minutesCompleted).toBe(result1.analyzedMinutes + result2.analyzedMinutes)
    })

    test('saves detections', async () => {
      // Act
      const response1 = await request(superUserApp).post(`/${JOB_RUNNING.id}/results`).send(VALID_JOB_RESULT)
      const detections = await models.Detection.findAll({ where: { classifier_id: JOB_RUNNING.classifierId } })

      // Assert
      expect(response1.statusCode).toBe(201)
      expect(detections.length).toBe(VALID_JOB_RESULT.detections.length)
    })
  })

  describe('invalid usage', () => {
    test('400 if invalid analyzedMinutes', async () => {
      // Arrange
      const result1 = { analyzedMinutes: 'potato', detections: [] }

      // Act
      const response1 = await request(superUserApp).post(`/${JOB_RUNNING.id}/results`).send(result1)

      // Assert
      expect(response1.statusCode).toBe(400)
    })

    test('400 if invalid detections', async () => {
      // Arrange
      const result1 = { analyzedMinutes: 15_000, detections: 'potato' }

      // Act
      const response1 = await request(superUserApp).post(`/${JOB_RUNNING.id}/results`).send(result1)

      // Assert
      expect(response1.statusCode).toBe(400)
    })

    test('403 if not super-user', async () => {
      // Act
      const response1 = await request(app).post(`/${JOB_RUNNING.id}/results`).send(VALID_JOB_RESULT)
      const jobUpdated1 = await models.ClassifierJob.findByPk(JOB_RUNNING.id)

      // Assert
      expect(response1.statusCode).toBe(403)
      expect(jobUpdated1.minutesCompleted).toBe(0)
    })

    test('404 if classifier-job does not exist', async () => {
      // Arrange
      const notJobId = 10000
      const notJob = await models.ClassifierJob.findByPk(notJobId)
      expect(notJob).toBeNull() // Pre-condition: Job does not exist

      // Act
      const response1 = await request(superUserApp).post(`/${notJobId}/results`).send(VALID_JOB_RESULT)

      // Assert
      expect(response1.statusCode).toBe(404)
    })
  })
})

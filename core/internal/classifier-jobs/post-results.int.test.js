const routes = require('./index')
const models = require('../../_models')
const { expressApp, seedValues, muteConsole, truncateNonBase } = require('../../../common/testing/sequelize')
const request = require('supertest')
const { RUNNING } = require('../../classifier-jobs/classifier-job-status')

// Test data
const CLASSIFICATION_1 = { id: 100001, value: 'aureus', title: 'Canis aureus', typeId: 1 }
const CLASSIFICATION_2 = { id: 100002, value: 'corrugatus', title: 'Aceros corrugatus', typeId: 1 }
const CLASSIFICATIONS = [CLASSIFICATION_1, CLASSIFICATION_2]

const CLASSIFIER_1 = { id: 671, name: 'sounds of the underground', version: 1, externalId: '555666', createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: '???', lastExecutedAt: null, isPublic: true }
const CLASSIFIERS = [CLASSIFIER_1]

const CLASSIFIER_OUTPUT_1 = { id: 5551, classifierId: CLASSIFIER_1.id, classificationId: CLASSIFICATION_1.id, outputClassName: `el-${CLASSIFICATION_1.value}` }
const CLASSIFIER_OUTPUT_2 = { id: 5552, classifierId: CLASSIFIER_1.id, classificationId: CLASSIFICATION_2.id, outputClassName: `el-${CLASSIFICATION_2.value}` }
const CLASSIFIER_OUTPUTS = [CLASSIFIER_OUTPUT_1, CLASSIFIER_OUTPUT_2]

const PROJECT_1 = { id: 'testproject1', name: 'Test project', createdById: seedValues.otherUserId }
const PROJECTS = [PROJECT_1]

const STREAM_1 = { id: 'LilSjZJkRK20', name: 'Test stream', start: '2021-01-02T01:00:00.000Z', end: '2021-01-02T05:00:00.000Z', isPublic: true, createdById: seedValues.otherUserId, projectId: PROJECT_1.id }
const STREAMS = [STREAM_1]

const JOB_RUNNING = { id: 123, status: RUNNING, classifierId: CLASSIFIER_1.id, projectId: PROJECT_1.id, queryStreams: 'Test*', queryStart: '2021-01-01', queryEnd: '2022-01-01', queryHours: '1,2', createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-09-07T08:07:49.158Z', startedAt: '2022-09-07T08:07:49.158Z', completedAt: null }
const JOBS = [JOB_RUNNING]

async function seedTestData () {
  for (const classification of CLASSIFICATIONS) {
    await models.Classification.findOrCreate({ where: classification })
  }
  for (const classifier of CLASSIFIERS) {
    await models.Classifier.findOrCreate({ where: classifier })
  }
  for (const output of CLASSIFIER_OUTPUTS) {
    await models.ClassifierOutput.findOrCreate({ where: output })
  }
  for (const project of PROJECTS) {
    await models.Project.findOrCreate({ where: project })
  }
  await models.UserProjectRole.findOrCreate({ where: { user_id: seedValues.primaryUserId, project_id: PROJECT_1.id, role_id: seedValues.roleMember } })
  await models.UserProjectRole.findOrCreate({ where: { user_id: seedValues.anotherUserId, project_id: PROJECT_1.id, role_id: seedValues.roleGuest } })
  for (const stream of STREAMS) {
    await models.Stream.findOrCreate({ where: stream })
  }
  for (const job of JOBS) {
    await models.ClassifierJob.findOrCreate({ where: job })
  }
}

beforeAll(async () => {
  muteConsole('warn')
})

afterEach(async () => {
  await truncateNonBase(models)
})

beforeEach(async () => {
  await seedTestData()
})

describe('POST /internal/classifier-jobs/:id/results', () => {
  // Setup normal & super-user apps
  expressApp().use('/', routes)
  const superUserApp = expressApp({ is_super: true }).use('/', routes)

  const VALID_JOB_RESULT = {
    analyzed_minutes: 5,
    detections: [
      {
        stream_id: STREAM_1.id,
        classifier: JOB_RUNNING.classifierId,
        classification: CLASSIFIER_OUTPUT_1.outputClassName,
        start: '2021-01-02T01:32:07.000Z',
        end: '2021-01-02T01:32:09.000Z',
        confidence: 0.975123
      }, {
        stream_id: STREAM_1.id,
        classifier: JOB_RUNNING.classifierId,
        classification: CLASSIFIER_OUTPUT_2.outputClassName,
        start: '2021-01-02T01:33:49.000Z',
        end: '2021-01-02T01:33:50.000Z',
        confidence: 0.921955
      }
    ],
    processed_segments: [
      {
        start: '2021-01-02T01:30:00.000Z',
        stream: STREAM_1.id,
        classifier: JOB_RUNNING.classifierId,
        classifier_job: JOB_RUNNING.id
      },
      {
        start: '2021-01-02T01:32:00.000Z',
        stream: STREAM_1.id,
        classifier: JOB_RUNNING.classifierId,
        classifier_job: JOB_RUNNING.id
      }
    ]
  }

  describe('valid usage', () => {
    test('201 on success', async () => {
      // Act
      const response1 = await request(superUserApp).post(`/${JOB_RUNNING.id}/results`).send(VALID_JOB_RESULT)

      // Assert
      expect(response1.statusCode).toBe(201)
      const job = await models.ClassifierJob.findOne({ where: { id: JOB_RUNNING.id } })
      expect(job.minutesCompleted).toBe(5)
      const detections = await models.Detection.findAll({ sort: [['start', 'ASC']] })
      expect(detections.length).toBe(2)
      expect(detections[0].start.toISOString()).toBe(VALID_JOB_RESULT.detections[0].start)
      expect(detections[0].end.toISOString()).toBe(VALID_JOB_RESULT.detections[0].end)
      expect(detections[0].stream_id).toBe(VALID_JOB_RESULT.detections[0].stream_id)
      expect(detections[0].classification_id).toBe(CLASSIFICATION_1.id)
      expect(detections[0].confidence).toBe(VALID_JOB_RESULT.detections[0].confidence)
      expect(detections[1].start.toISOString()).toBe(VALID_JOB_RESULT.detections[1].start)
      expect(detections[1].end.toISOString()).toBe(VALID_JOB_RESULT.detections[1].end)
      expect(detections[1].stream_id).toBe(VALID_JOB_RESULT.detections[1].stream_id)
      expect(detections[1].classification_id).toBe(CLASSIFICATION_2.id)
      expect(detections[1].confidence).toBe(VALID_JOB_RESULT.detections[1].confidence)
      const segments = await models.ClassifierProcessedSegment.findAll({ sort: [['start', 'ASC']] })
      expect(segments[0].start.toISOString()).toBe(VALID_JOB_RESULT.processed_segments[0].start)
      expect(segments[0].streamId).toBe(VALID_JOB_RESULT.processed_segments[0].stream)
      expect(segments[0].classifierId).toBe(VALID_JOB_RESULT.processed_segments[0].classifier)
      expect(segments[0].classifierJobId).toBe(VALID_JOB_RESULT.processed_segments[0].classifier_job)
      expect(segments[1].start.toISOString()).toBe(VALID_JOB_RESULT.processed_segments[1].start)
      expect(segments[1].streamId).toBe(VALID_JOB_RESULT.processed_segments[1].stream)
      expect(segments[1].classifierId).toBe(VALID_JOB_RESULT.processed_segments[1].classifier)
      expect(segments[1].classifierJobId).toBe(VALID_JOB_RESULT.processed_segments[1].classifier_job)
    })

    test('saves analyzed minutes', async () => {
      // Arrange
      const result1 = { analyzed_minutes: 15, detections: [], processed_segments: [] }
      const result2 = { analyzed_minutes: 25, detections: [], processed_segments: [] }

      // Act
      const response1 = await request(superUserApp).post(`/${JOB_RUNNING.id}/results`).send(result1)
      const job1 = await models.ClassifierJob.findByPk(JOB_RUNNING.id)
      const response2 = await request(superUserApp).post(`/${JOB_RUNNING.id}/results`).send(result2)
      const job2 = await models.ClassifierJob.findByPk(JOB_RUNNING.id)

      // Assert
      expect(response1.statusCode).toBe(201)
      expect(response2.statusCode).toBe(201)
      expect(job1.minutesCompleted).toBe(result1.analyzed_minutes)
      expect(job2.minutesCompleted).toBe(result1.analyzed_minutes + result2.analyzed_minutes)
    })
  })

  describe('invalid usage', () => {
    test('400 if invalid analyzed_minutes', async () => {
      // Arrange
      const result1 = { analyzed_minutes: 'potato', detections: [] }

      // Act
      const response1 = await request(superUserApp).post(`/${JOB_RUNNING.id}/results`).send(result1)

      // Assert
      expect(response1.statusCode).toBe(400)
    })

    test('400 if invalid detections', async () => {
      // Arrange
      const result1 = { analyzed_minutes: 15_000, detections: 'potato' }

      // Act
      const response1 = await request(superUserApp).post(`/${JOB_RUNNING.id}/results`).send(result1)

      // Assert
      expect(response1.statusCode).toBe(400)
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

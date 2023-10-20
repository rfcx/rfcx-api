const models = require('../../core/_models')
const { truncateNonBase, seedValues, muteConsole } = require('../../common/testing/sequelize')
const { WAITING, RUNNING, DONE, CANCELLED, ERROR } = require('../../core/classifier-jobs/classifier-job-status')
const performTask = require('./index')

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

describe('classifer-job-finished task', () => {
  test('calculates and saves classifier-job-summary after changing status to DONE', async () => {
    await models.Detection.create({ classifierJobId: JOB_RUNNING.id, streamId: STREAM_1.id, classificationId: CLASSIFICATION_1.id, classifierId: CLASSIFIER_1.id, start: '2022-01-01T00:00:00.000Z', end: '2022-01-01T00:00:01.000Z', confidence: 0.99 })
    await models.Detection.create({ classifierJobId: JOB_RUNNING.id, streamId: STREAM_1.id, classificationId: CLASSIFICATION_2.id, classifierId: CLASSIFIER_1.id, start: '2022-01-01T00:00:00.000Z', end: '2022-01-01T00:00:01.000Z', confidence: 0.99 })
    await models.Detection.create({ classifierJobId: JOB_RUNNING.id, streamId: STREAM_1.id, classificationId: CLASSIFICATION_3.id, classifierId: CLASSIFIER_1.id, start: '2022-01-01T00:00:00.000Z', end: '2022-01-01T00:00:01.000Z', confidence: 0.000001 })
    await models.Detection.create({ classifierJobId: JOB_DONE.id, streamId: STREAM_1.id, classificationId: CLASSIFICATION_1.id, classifierId: CLASSIFIER_1.id, start: '2022-01-01T00:00:00.000Z', end: '2022-01-01T00:00:01.000Z', confidence: 0.99 })
    await models.Detection.create({ streamId: STREAM_1.id, classificationId: CLASSIFICATION_3.id, classifierId: CLASSIFIER_1.id, start: '2022-01-01T00:00:00.000Z', end: '2022-01-01T00:00:01.000Z', confidence: 0.99 })

    expect((await models.ClassifierJobSummary.findAll()).length).toBe(0)
    // Act
    await performTask({ jobId: JOB_RUNNING.id })

    const classifierJobSummaries = (await models.ClassifierJobSummary.findAll()).sort((a, b) => a.classificationId < b.classificationId)
    // Assert
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

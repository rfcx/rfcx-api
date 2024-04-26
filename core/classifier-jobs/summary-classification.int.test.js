const { truncateNonBase, expressApp, seedValues, muteConsole } = require('../../common/testing/sequelize')
const models = require('../_models')
const { WAITING, DONE } = require('./classifier-job-status')
const routes = require('./index')
const request = require('supertest')

const CLASSIFICATION_1 = { id: 232, value: 'chainsaw', title: 'Chainsaw', typeId: 1, source_id: 1 }
const CLASSIFICATION_2 = { id: 233, value: 'vehicle', title: 'Vehicle', typeId: 1, source_id: 1 }
const CLASSIFICATION_3 = { id: 234, value: 'gunshot', title: 'Gunshot', typeId: 1, source_id: 1 }
const CLASSIFICATION_4 = { id: 235, value: 'aircraft', title: 'Aircraft', typeId: 1, source_id: 1 }
const CLASSIFICATIONS = [CLASSIFICATION_1, CLASSIFICATION_2, CLASSIFICATION_3, CLASSIFICATION_4]

const CLASSIFIER_1 = { id: 151, name: 'sounds of the underground', version: 1, externalId: '555666', createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: '???', lastExecutedAt: null, isPublic: true }
const CLASSIFIER_OUTPUT_1 = { id: 100, classifierId: CLASSIFIER_1.id, classificationId: CLASSIFICATION_1.id, outputClassName: `${CLASSIFICATION_1.value}_custom`, ignoreThreshold: 0.5 }
const CLASSIFIER_OUTPUT_2 = { id: 101, classifierId: CLASSIFIER_1.id, classificationId: CLASSIFICATION_2.id, outputClassName: `${CLASSIFICATION_2.value}_custom`, ignoreThreshold: 0.5 }
const CLASSIFIER_OUTPUT_3 = { id: 102, classifierId: CLASSIFIER_1.id, classificationId: CLASSIFICATION_3.id, outputClassName: `${CLASSIFICATION_3.value}_custom`, ignoreThreshold: 0.5 }
const CLASSIFIER_OUTPUT_4 = { id: 104, classifierId: CLASSIFIER_1.id, classificationId: CLASSIFICATION_4.id, outputClassName: `${CLASSIFICATION_4.value}_custom`, ignoreThreshold: 0.5 }
const CLASSIFIER_OUTPUTS = [CLASSIFIER_OUTPUT_1, CLASSIFIER_OUTPUT_2, CLASSIFIER_OUTPUT_3, CLASSIFIER_OUTPUT_4]

const PROJECT_1 = { id: 'testprojec01', name: 'Test project', createdById: seedValues.otherUserId }
const PROJECT_2 = { id: 'testprojec02', name: 'Test project 2', createdById: seedValues.otherUserId }
const PROJECT_3 = { id: 'testprojec03', name: 'Test project 3', createdById: seedValues.primaryUserId }
const PROJECT_4 = { id: 'testprojec04', name: 'Test project 4', createdById: seedValues.anotherUserId }
const PROJECTS = [PROJECT_1, PROJECT_2, PROJECT_3, PROJECT_4]

const ROLE_1 = { user_id: seedValues.primaryUserId, project_id: PROJECT_1.id, role_id: seedValues.roleMember }
const ROLE_2 = { user_id: seedValues.primaryUserId, project_id: PROJECT_2.id, role_id: seedValues.roleGuest }
const ROLE_3 = { user_id: seedValues.primaryUserId, project_id: PROJECT_3.id, role_id: seedValues.roleAdmin }
const ROLE_4 = { user_id: seedValues.anotherUserId, project_id: PROJECT_4.id, role_id: seedValues.roleAdmin }
const ROLES = [ROLE_1, ROLE_2, ROLE_3, ROLE_4]

const STREAM_1 = { id: 'rrr0stream01', name: 'Test stream', projectId: PROJECT_1.id, createdById: PROJECT_1.createdById }
const STREAM_2 = { id: 'rrr0stream02', name: 'Test stream 2', projectId: PROJECT_1.id, createdById: PROJECT_1.createdById }
const STREAM_3 = { id: 'rrr0stream03', name: 'Test stream 3', projectId: PROJECT_2.id, createdById: PROJECT_1.createdById }
const STREAM_4 = { id: 'rrr0stream04', name: 'Test stream 4', projectId: PROJECT_3.id, createdById: PROJECT_1.createdById }
const STREAM_5 = { id: 'rrr0stream05', name: 'Test stream 5', projectId: PROJECT_4.id, createdById: PROJECT_1.createdById }
const STREAMS = [STREAM_1, STREAM_2, STREAM_3, STREAM_4, STREAM_5]

const JOB_1 = { id: 9001, classifierId: CLASSIFIER_1.id, projectId: STREAM_1.projectId, status: WAITING, queryStreams: `${STREAM_1.name}, ${STREAM_2.name}`, queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', minutesTotal: 2, minutesCompleted: 0, createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-09-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOB_2 = { id: 9002, classifierId: CLASSIFIER_1.id, projectId: STREAM_1.projectId, status: WAITING, queryStreams: `${STREAM_1.name}`, queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '11,13', minutesTotal: 4, minutesCompleted: 0, createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-10-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOB_3 = { id: 9003, classifierId: CLASSIFIER_1.id, projectId: STREAM_3.projectId, status: DONE, queryStreams: `${STREAM_3.name}`, queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', minutesTotal: 2, minutesCompleted: 0, createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-07-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOB_4 = { id: 9004, classifierId: CLASSIFIER_1.id, projectId: STREAM_4.projectId, status: DONE, queryStreams: `${STREAM_4.name}`, queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', minutesTotal: 2, minutesCompleted: 0, createdById: seedValues.primaryUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-07-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOB_5 = { id: 9005, classifierId: CLASSIFIER_1.id, projectId: STREAM_5.projectId, status: DONE, queryStreams: `${STREAM_5.name}`, queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', minutesTotal: 2, minutesCompleted: 0, createdById: seedValues.anotherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-07-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOBS = [JOB_1, JOB_2, JOB_3, JOB_4, JOB_5]

const CLASSIFIER_JOB_1_STREAM_1 = { classifierJobId: JOB_1.id, streamId: STREAM_1.id }
const CLASSIFIER_JOB_1_STREAM_2 = { classifierJobId: JOB_1.id, streamId: STREAM_2.id }
const CLASSIFIER_JOB_2_STREAM_1 = { classifierJobId: JOB_2.id, streamId: STREAM_1.id }
const CLASSIFIER_JOB_3_STREAM_1 = { classifierJobId: JOB_3.id, streamId: STREAM_3.id }
const CLASSIFIER_JOB_4_STREAM_1 = { classifierJobId: JOB_4.id, streamId: STREAM_4.id }
const CLASSIFIER_JOB_5_STREAM_1 = { classifierJobId: JOB_5.id, streamId: STREAM_5.id }
const CLASSIFIER_JOB_STREAMS = [CLASSIFIER_JOB_1_STREAM_1, CLASSIFIER_JOB_1_STREAM_2, CLASSIFIER_JOB_2_STREAM_1, CLASSIFIER_JOB_3_STREAM_1, CLASSIFIER_JOB_4_STREAM_1, CLASSIFIER_JOB_5_STREAM_1]

// beforeAll(() => {
//   muteConsole()
// })

beforeEach(async () => {
  await seedTestData()
})

afterEach(async () => {
  await truncateNonBase(models)
})

afterAll(async () => {
  await models.sequelize.close()
})

async function seedTestData () {
  await models.Classification.bulkCreate(CLASSIFICATIONS)
  await models.Classifier.create(CLASSIFIER_1)
  await models.ClassifierOutput.bulkCreate(CLASSIFIER_OUTPUTS)
  await models.Project.bulkCreate(PROJECTS)
  await models.Stream.bulkCreate(STREAMS)
  await models.UserProjectRole.bulkCreate(ROLES)
  await models.ClassifierJob.bulkCreate(JOBS)
  await models.ClassifierJobStream.bulkCreate(CLASSIFIER_JOB_STREAMS)
}

describe('GET /classifier-jobs/{id}/summary/{value}', () => {
  const app = expressApp()
  app.use('/', routes)

  test('returns data successfully', async () => {
    await models.ClassifierJobSummary.bulkCreate([
      { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_1.id, total: 1, confirmed: 1, rejected: 0, uncertain: 0 },
      { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_2.id, total: 1, confirmed: 0, rejected: 1, uncertain: 0 },
      { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_3.id, total: 1, confirmed: 0, rejected: 0, uncertain: 1 },
      { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_4.id, total: 0, confirmed: 0, rejected: 0, uncertain: 0 },
      { classifierJobId: JOB_2.id, classificationId: CLASSIFICATION_1.id, total: 1, confirmed: 1, rejected: 0, uncertain: 1 }
    ])

    const response = await request(app).get(`/${JOB_1.id}/summary/${CLASSIFICATION_1.value}`)

    expect(response.statusCode).toEqual(200)
    expect(response.body.title).toEqual(CLASSIFICATION_1.title)
    expect(response.body.value).toEqual(CLASSIFICATION_1.value)
    expect(response.body.total).toEqual(1)
    expect(response.body.confirmed).toEqual(1)
    expect(response.body.rejected).toEqual(0)
    expect(response.body.uncertain).toEqual(0)
    expect(response.body.unreviewed).toEqual(0)
  })

  test.todo('returns 404 on invalid classifier id')

  test.todo('returns 404 on classification value outside the classifier')

  test.todo('returns 404 on classification value that does not have any value')
})

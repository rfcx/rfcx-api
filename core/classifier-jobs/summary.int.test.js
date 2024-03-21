const routes = require('./index')
const models = require('../_models')
const { expressApp, seedValues, truncateNonBase, muteConsole } = require('../../common/testing/sequelize')
const request = require('supertest')
const { WAITING, DONE } = require('./classifier-job-status')

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

beforeAll(() => {
  muteConsole()
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

describe('GET /classifier-jobs/{id}/summary', () => {
  const app = expressApp()
  app.use('/', routes)

  describe('Valid', () => {
    test('returns valid data', async () => {
      await models.ClassifierJobSummary.bulkCreate([
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_1.id, total: 1, confirmed: 1, rejected: 0, uncertain: 0 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_2.id, total: 1, confirmed: 0, rejected: 1, uncertain: 0 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_3.id, total: 1, confirmed: 0, rejected: 0, uncertain: 1 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_4.id, total: 0, confirmed: 0, rejected: 0, uncertain: 0 },
        { classifierJobId: JOB_2.id, classificationId: CLASSIFICATION_1.id, total: 1, confirmed: 1, rejected: 0, uncertain: 1 }
      ])

      const response = await request(app).get(`/${JOB_1.id}/summary`).query()

      const result = response.body
      expect(response.statusCode).toBe(200)
      expect(result.classificationsSummary.length).toBe(4)
      const output1 = result.classificationsSummary.find(o => CLASSIFICATION_1.value === o.value)
      expect(output1.id).toBeUndefined()
      expect(output1.value).toBe(CLASSIFICATION_1.value)
      expect(output1.title).toBe(CLASSIFICATION_1.title)
      expect(output1.total).toBe(1)
      expect(output1.unreviewed).toBe(0)
      expect(output1.confirmed).toBe(1)
      expect(output1.rejected).toBe(0)
      expect(output1.uncertain).toBe(0)
      const output2 = result.classificationsSummary.find(o => CLASSIFICATION_2.value === o.value)
      expect(output2.value).toBe(CLASSIFICATION_2.value)
      expect(output2.title).toBe(CLASSIFICATION_2.title)
      expect(output2.total).toBe(1)
      expect(output1.unreviewed).toBe(0)
      expect(output2.confirmed).toBe(0)
      expect(output2.rejected).toBe(1)
      expect(output2.uncertain).toBe(0)
      const output3 = result.classificationsSummary.find(o => CLASSIFICATION_3.value === o.value)
      expect(output3.value).toBe(CLASSIFICATION_3.value)
      expect(output3.title).toBe(CLASSIFICATION_3.title)
      expect(output3.total).toBe(1)
      expect(output1.unreviewed).toBe(0)
      expect(output3.confirmed).toBe(0)
      expect(output3.rejected).toBe(0)
      expect(output3.uncertain).toBe(1)
      const output4 = result.classificationsSummary.find(o => CLASSIFICATION_4.value === o.value)
      expect(output4.value).toBe(CLASSIFICATION_4.value)
      expect(output4.title).toBe(CLASSIFICATION_4.title)
      expect(output4.total).toBe(0)
      expect(output1.unreviewed).toBe(0)
      expect(output4.confirmed).toBe(0)
      expect(output4.rejected).toBe(0)
      expect(output4.uncertain).toBe(0)
    })

    test('returns valid data with limit', async () => {
      await models.ClassifierJobSummary.bulkCreate([
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_1.id, total: 1, confirmed: 1, rejected: 0, uncertain: 0 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_2.id, total: 1, confirmed: 0, rejected: 1, uncertain: 0 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_3.id, total: 1, confirmed: 0, rejected: 0, uncertain: 1 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_4.id, total: 0, confirmed: 0, rejected: 0, uncertain: 0 },
        { classifierJobId: JOB_2.id, classificationId: CLASSIFICATION_1.id, total: 1, confirmed: 1, rejected: 0, uncertain: 1 }
      ])

      const response = await request(app).get(`/${JOB_1.id}/summary`).query({ limit: 1 })

      const result = response.body
      expect(response.statusCode).toBe(200)
      expect(result.classificationsSummary.length).toBe(1)
      const output1 = result.classificationsSummary.find(o => CLASSIFICATION_1.value === o.value)
      expect(output1.id).toBeUndefined()
      expect(output1.value).toBe(CLASSIFICATION_1.value)
      expect(output1.title).toBe(CLASSIFICATION_1.title)
      expect(output1.total).toBe(1)
      expect(output1.unreviewed).toBe(0)
      expect(output1.confirmed).toBe(1)
      expect(output1.rejected).toBe(0)
      expect(output1.uncertain).toBe(0)
    })

    test('returns valid data with offset', async () => {
      await models.ClassifierJobSummary.bulkCreate([
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_1.id, total: 1, confirmed: 1, rejected: 0, uncertain: 0 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_2.id, total: 1, confirmed: 0, rejected: 1, uncertain: 0 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_3.id, total: 1, confirmed: 0, rejected: 0, uncertain: 1 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_4.id, total: 0, confirmed: 0, rejected: 0, uncertain: 0 },
        { classifierJobId: JOB_2.id, classificationId: CLASSIFICATION_1.id, total: 1, confirmed: 1, rejected: 0, uncertain: 1 }
      ])

      const response = await request(app).get(`/${JOB_1.id}/summary`).query({ offset: 1 })

      const result = response.body
      expect(response.statusCode).toBe(200)
      expect(response.headers['total-items']).toBe('4')
      expect(result.classificationsSummary.length).toBe(3)
      const output1 = result.classificationsSummary.find(o => CLASSIFICATION_2.value === o.value)
      expect(output1.id).toBeUndefined()
      expect(output1.value).toBe(CLASSIFICATION_2.value)
      expect(output1.title).toBe(CLASSIFICATION_2.title)
      expect(output1.total).toBe(1)
      expect(output1.unreviewed).toBe(0)
      expect(output1.confirmed).toBe(0)
      expect(output1.rejected).toBe(1)
      expect(output1.uncertain).toBe(0)
      const output2 = result.classificationsSummary.find(o => CLASSIFICATION_3.value === o.value)
      expect(output2.id).toBeUndefined()
      expect(output2.value).toBe(CLASSIFICATION_3.value)
      expect(output2.title).toBe(CLASSIFICATION_3.title)
      expect(output2.total).toBe(1)
      expect(output1.unreviewed).toBe(0)
      expect(output2.confirmed).toBe(0)
      expect(output2.rejected).toBe(0)
      expect(output2.uncertain).toBe(1)
      const output3 = result.classificationsSummary.find(o => CLASSIFICATION_4.value === o.value)
      expect(output3.id).toBeUndefined()
      expect(output3.value).toBe(CLASSIFICATION_4.value)
      expect(output3.title).toBe(CLASSIFICATION_4.title)
      expect(output3.total).toBe(0)
      expect(output1.unreviewed).toBe(0)
      expect(output3.confirmed).toBe(0)
      expect(output3.rejected).toBe(0)
      expect(output3.uncertain).toBe(0)
    })

    test('returns valid data with limit offset', async () => {
      await models.ClassifierJobSummary.bulkCreate([
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_1.id, total: 1, confirmed: 1, rejected: 0, uncertain: 0 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_2.id, total: 1, confirmed: 0, rejected: 1, uncertain: 0 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_3.id, total: 1, confirmed: 0, rejected: 0, uncertain: 1 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_4.id, total: 0, confirmed: 0, rejected: 0, uncertain: 0 },
        { classifierJobId: JOB_2.id, classificationId: CLASSIFICATION_1.id, total: 1, confirmed: 1, rejected: 0, uncertain: 1 }
      ])

      const response = await request(app).get(`/${JOB_1.id}/summary`).query({ limit: 1, offset: 1 })

      const result = response.body
      expect(response.statusCode).toBe(200)
      expect(response.headers['total-items']).toBe('4')
      expect(result.classificationsSummary.length).toBe(1)
      const output1 = result.classificationsSummary.find(o => CLASSIFICATION_2.value === o.value)
      expect(output1.id).toBeUndefined()
      expect(output1.value).toBe(CLASSIFICATION_2.value)
      expect(output1.title).toBe(CLASSIFICATION_2.title)
      expect(output1.total).toBe(1)
      expect(output1.unreviewed).toBe(0)
      expect(output1.confirmed).toBe(0)
      expect(output1.rejected).toBe(1)
      expect(output1.uncertain).toBe(0)
    })

    test('returns valid data with limit sort by name', async () => {
      await models.ClassifierJobSummary.bulkCreate([
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_1.id, total: 1, confirmed: 1, rejected: 0, uncertain: 0 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_2.id, total: 1, confirmed: 0, rejected: 1, uncertain: 0 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_3.id, total: 1, confirmed: 0, rejected: 0, uncertain: 1 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_4.id, total: 0, confirmed: 0, rejected: 0, uncertain: 0 },
        { classifierJobId: JOB_2.id, classificationId: CLASSIFICATION_1.id, total: 1, confirmed: 1, rejected: 0, uncertain: 1 }
      ])

      const response = await request(app).get(`/${JOB_1.id}/summary`).query({ sort: 'name' })

      const result = response.body
      expect(response.statusCode).toBe(200)
      expect(response.headers['total-items']).toBe('4')
      expect(result.classificationsSummary.length).toBe(4)
      expect(result.classificationsSummary[0].title).toBe(CLASSIFICATION_4.title)
      expect(result.classificationsSummary[1].title).toBe(CLASSIFICATION_1.title)
      expect(result.classificationsSummary[2].title).toBe(CLASSIFICATION_3.title)
      expect(result.classificationsSummary[3].title).toBe(CLASSIFICATION_2.title)
    })

    test('returns valid data with limit sort by name DESC', async () => {
      await models.ClassifierJobSummary.bulkCreate([
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_1.id, total: 1, confirmed: 1, rejected: 0, uncertain: 0 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_2.id, total: 1, confirmed: 0, rejected: 1, uncertain: 0 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_3.id, total: 1, confirmed: 0, rejected: 0, uncertain: 1 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_4.id, total: 0, confirmed: 0, rejected: 0, uncertain: 0 },
        { classifierJobId: JOB_2.id, classificationId: CLASSIFICATION_1.id, total: 1, confirmed: 1, rejected: 0, uncertain: 1 }
      ])

      const response = await request(app).get(`/${JOB_1.id}/summary`).query({ sort: '-name' })

      const result = response.body
      expect(response.statusCode).toBe(200)
      expect(response.headers['total-items']).toBe('4')
      expect(result.classificationsSummary.length).toBe(4)
      expect(result.classificationsSummary[0].title).toBe(CLASSIFICATION_2.title)
      expect(result.classificationsSummary[1].title).toBe(CLASSIFICATION_3.title)
      expect(result.classificationsSummary[2].title).toBe(CLASSIFICATION_1.title)
      expect(result.classificationsSummary[3].title).toBe(CLASSIFICATION_4.title)
    })

    test('returns valid data with unreviewed ASC', async () => {
      await models.ClassifierJobSummary.bulkCreate([
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_1.id, total: 30, confirmed: 10, rejected: 0, uncertain: 0 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_2.id, total: 30, confirmed: 12, rejected: 5, uncertain: 0 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_3.id, total: 30, confirmed: 5, rejected: 4, uncertain: 2 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_4.id, total: 30, confirmed: 0, rejected: 11, uncertain: 7 },
        { classifierJobId: JOB_2.id, classificationId: CLASSIFICATION_1.id, total: 30, confirmed: 13, rejected: 0, uncertain: 3 }
      ])

      const response = await request(app).get(`/${JOB_1.id}/summary`).query({ sort: 'unreviewed' })

      const result = response.body
      expect(response.statusCode).toBe(200)
      expect(response.headers['total-items']).toBe('4')
      expect(result.classificationsSummary.length).toBe(4)
      expect(result.classificationsSummary[0].title).toBe(CLASSIFICATION_4.title)
      expect(result.classificationsSummary[1].title).toBe(CLASSIFICATION_2.title)
      expect(result.classificationsSummary[2].title).toBe(CLASSIFICATION_3.title)
      expect(result.classificationsSummary[3].title).toBe(CLASSIFICATION_1.title)
    })

    test('returns valid data with unvalidated DESC', async () => {
      await models.ClassifierJobSummary.bulkCreate([
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_1.id, total: 30, confirmed: 10, rejected: 0, uncertain: 0 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_2.id, total: 30, confirmed: 12, rejected: 5, uncertain: 0 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_3.id, total: 30, confirmed: 5, rejected: 4, uncertain: 2 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_4.id, total: 30, confirmed: 0, rejected: 11, uncertain: 7 },
        { classifierJobId: JOB_2.id, classificationId: CLASSIFICATION_1.id, total: 30, confirmed: 13, rejected: 0, uncertain: 3 }
      ])

      const response = await request(app).get(`/${JOB_1.id}/summary`).query({ sort: '-unreviewed' })

      const result = response.body
      expect(response.statusCode).toBe(200)
      expect(response.headers['total-items']).toBe('4')
      expect(result.classificationsSummary.length).toBe(4)
      expect(result.classificationsSummary[0].title).toBe(CLASSIFICATION_1.title)
      expect(result.classificationsSummary[1].title).toBe(CLASSIFICATION_3.title)
      expect(result.classificationsSummary[2].title).toBe(CLASSIFICATION_2.title)
      expect(result.classificationsSummary[3].title).toBe(CLASSIFICATION_4.title)
    })

    test('returns valid data with confirmed DESC', async () => {
      await models.ClassifierJobSummary.bulkCreate([
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_1.id, total: 30, confirmed: 10, rejected: 0, uncertain: 0 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_2.id, total: 30, confirmed: 12, rejected: 5, uncertain: 0 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_3.id, total: 30, confirmed: 5, rejected: 4, uncertain: 2 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_4.id, total: 30, confirmed: 0, rejected: 11, uncertain: 7 },
        { classifierJobId: JOB_2.id, classificationId: CLASSIFICATION_1.id, total: 30, confirmed: 13, rejected: 0, uncertain: 3 }
      ])

      const response = await request(app).get(`/${JOB_1.id}/summary`).query({ sort: '-confirmed' })

      const result = response.body
      expect(response.statusCode).toBe(200)
      expect(response.headers['total-items']).toBe('4')
      expect(result.classificationsSummary.length).toBe(4)
      expect(result.classificationsSummary[0].title).toBe(CLASSIFICATION_2.title)
      expect(result.classificationsSummary[1].title).toBe(CLASSIFICATION_1.title)
      expect(result.classificationsSummary[2].title).toBe(CLASSIFICATION_3.title)
      expect(result.classificationsSummary[3].title).toBe(CLASSIFICATION_4.title)
    })

    test('returns valid data with rejected DESC', async () => {
      await models.ClassifierJobSummary.bulkCreate([
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_1.id, total: 30, confirmed: 10, rejected: 0, uncertain: 0 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_2.id, total: 30, confirmed: 12, rejected: 5, uncertain: 0 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_3.id, total: 30, confirmed: 5, rejected: 4, uncertain: 2 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_4.id, total: 30, confirmed: 0, rejected: 11, uncertain: 7 },
        { classifierJobId: JOB_2.id, classificationId: CLASSIFICATION_1.id, total: 30, confirmed: 13, rejected: 0, uncertain: 3 }
      ])

      const response = await request(app).get(`/${JOB_1.id}/summary`).query({ sort: '-rejected' })

      const result = response.body
      expect(response.statusCode).toBe(200)
      expect(response.headers['total-items']).toBe('4')
      expect(result.classificationsSummary.length).toBe(4)
      expect(result.classificationsSummary[0].title).toBe(CLASSIFICATION_4.title)
      expect(result.classificationsSummary[1].title).toBe(CLASSIFICATION_2.title)
      expect(result.classificationsSummary[2].title).toBe(CLASSIFICATION_3.title)
      expect(result.classificationsSummary[3].title).toBe(CLASSIFICATION_1.title)
    })

    test('returns valid data with uncertain DESC', async () => {
      await models.ClassifierJobSummary.bulkCreate([
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_1.id, total: 30, confirmed: 10, rejected: 0, uncertain: 0 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_2.id, total: 30, confirmed: 12, rejected: 5, uncertain: 0 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_3.id, total: 30, confirmed: 5, rejected: 4, uncertain: 2 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_4.id, total: 30, confirmed: 0, rejected: 11, uncertain: 7 },
        { classifierJobId: JOB_2.id, classificationId: CLASSIFICATION_1.id, total: 30, confirmed: 13, rejected: 0, uncertain: 3 }
      ])

      const response = await request(app).get(`/${JOB_1.id}/summary`).query({ sort: '-uncertain' })

      const result = response.body
      expect(response.statusCode).toBe(200)
      expect(response.headers['total-items']).toBe('4')
      expect(result.classificationsSummary.length).toBe(4)
      expect(result.classificationsSummary[0].title).toBe(CLASSIFICATION_4.title)
      expect(result.classificationsSummary[1].title).toBe(CLASSIFICATION_3.title)
      expect(result.classificationsSummary[2].title).toBe(CLASSIFICATION_1.title)
      expect(result.classificationsSummary[3].title).toBe(CLASSIFICATION_2.title)
    })

    test('returns valid data with uncertain DESC and name ASC', async () => {
      await models.ClassifierJobSummary.bulkCreate([
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_1.id, total: 30, confirmed: 10, rejected: 0, uncertain: 0 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_2.id, total: 30, confirmed: 12, rejected: 5, uncertain: 0 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_3.id, total: 30, confirmed: 5, rejected: 4, uncertain: 2 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_4.id, total: 30, confirmed: 0, rejected: 11, uncertain: 7 },
        { classifierJobId: JOB_2.id, classificationId: CLASSIFICATION_1.id, total: 30, confirmed: 13, rejected: 0, uncertain: 3 }
      ])

      const response = await request(app).get(`/${JOB_1.id}/summary`).query({ sort: 'name,-uncertain' })

      const result = response.body
      expect(response.statusCode).toBe(200)
      expect(response.headers['total-items']).toBe('4')
      expect(result.classificationsSummary.length).toBe(4)
      expect(result.classificationsSummary[0].title).toBe(CLASSIFICATION_4.title)
      expect(result.classificationsSummary[1].title).toBe(CLASSIFICATION_1.title)
      expect(result.classificationsSummary[2].title).toBe(CLASSIFICATION_3.title)
      expect(result.classificationsSummary[3].title).toBe(CLASSIFICATION_2.title)
    })

    test('returns valid data with keyword 1', async () => {
      await models.ClassifierJobSummary.bulkCreate([
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_1.id, total: 30, confirmed: 10, rejected: 0, uncertain: 0 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_2.id, total: 30, confirmed: 12, rejected: 5, uncertain: 0 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_3.id, total: 30, confirmed: 5, rejected: 4, uncertain: 2 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_4.id, total: 30, confirmed: 0, rejected: 11, uncertain: 7 },
        { classifierJobId: JOB_2.id, classificationId: CLASSIFICATION_1.id, total: 30, confirmed: 13, rejected: 0, uncertain: 3 }
      ])

      const response = await request(app).get(`/${JOB_1.id}/summary`).query({ keyword: 'i' })

      const result = response.body
      expect(response.statusCode).toBe(200)
      expect(response.headers['total-items']).toBe('3')
      expect(result.classificationsSummary.length).toBe(3)
      expect(result.classificationsSummary[0].title).toBe(CLASSIFICATION_1.title)
      expect(result.classificationsSummary[1].title).toBe(CLASSIFICATION_2.title)
      expect(result.classificationsSummary[2].title).toBe(CLASSIFICATION_4.title)
    })

    test('returns valid data with keyword 2', async () => {
      await models.ClassifierJobSummary.bulkCreate([
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_1.id, total: 30, confirmed: 10, rejected: 0, uncertain: 0 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_2.id, total: 30, confirmed: 12, rejected: 5, uncertain: 0 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_3.id, total: 30, confirmed: 5, rejected: 4, uncertain: 2 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_4.id, total: 30, confirmed: 0, rejected: 11, uncertain: 7 },
        { classifierJobId: JOB_2.id, classificationId: CLASSIFICATION_1.id, total: 30, confirmed: 13, rejected: 0, uncertain: 3 }
      ])

      const response = await request(app).get(`/${JOB_1.id}/summary`).query({ keyword: 'air' })

      const result = response.body
      expect(response.statusCode).toBe(200)
      expect(response.headers['total-items']).toBe('1')
      expect(result.classificationsSummary.length).toBe(1)
      expect(result.classificationsSummary[0].title).toBe(CLASSIFICATION_4.title)
    })

    test('returns valid data with keyword 3', async () => {
      await models.ClassifierJobSummary.bulkCreate([
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_1.id, total: 30, confirmed: 10, rejected: 0, uncertain: 0 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_2.id, total: 30, confirmed: 12, rejected: 5, uncertain: 0 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_3.id, total: 30, confirmed: 5, rejected: 4, uncertain: 2 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_4.id, total: 30, confirmed: 0, rejected: 11, uncertain: 7 },
        { classifierJobId: JOB_2.id, classificationId: CLASSIFICATION_1.id, total: 30, confirmed: 13, rejected: 0, uncertain: 3 }
      ])

      const response = await request(app).get(`/${JOB_1.id}/summary`).query({ keyword: 'adbasd' })

      const result = response.body
      expect(response.statusCode).toBe(200)
      expect(response.headers['total-items']).toBe('0')
      expect(result.classificationsSummary.length).toBe(0)
    })

    test('returns valid data with all params', async () => {
      await models.ClassifierJobSummary.bulkCreate([
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_1.id, total: 30, confirmed: 10, rejected: 0, uncertain: 0 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_2.id, total: 30, confirmed: 12, rejected: 5, uncertain: 0 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_3.id, total: 30, confirmed: 5, rejected: 4, uncertain: 2 },
        { classifierJobId: JOB_1.id, classificationId: CLASSIFICATION_4.id, total: 30, confirmed: 0, rejected: 11, uncertain: 7 },
        { classifierJobId: JOB_2.id, classificationId: CLASSIFICATION_1.id, total: 30, confirmed: 13, rejected: 0, uncertain: 3 }
      ])

      const response = await request(app).get(`/${JOB_1.id}/summary`).query({ limit: 2, offset: 1, sort: '-confirmed', keyword: 'i' })

      const result = response.body
      expect(response.statusCode).toBe(200)
      expect(response.headers['total-items']).toBe('3')
      expect(result.classificationsSummary.length).toBe(2)
      expect(result.classificationsSummary[0].title).toBe(CLASSIFICATION_1.title)
      expect(result.classificationsSummary[1].title).toBe(CLASSIFICATION_4.title)
    })
  })

  describe('Invalid', () => {
    test('returns forbidden error', async () => {
      const response = await request(app).get(`/${JOB_5.id}/summary`)
      expect(response.statusCode).toBe(403)
    })

    test('returns empty error', async () => {
      const response = await request(app).get('/230000123/summary')

      expect(response.statusCode).toBe(404)
    })

    test('returns sort validation error', async () => {
      const response = await request(app).get(`/${JOB_1.id}/summary`).query({ sort: 'idontknow' })

      expect(response.statusCode).toBe(500)
    })
  })
})

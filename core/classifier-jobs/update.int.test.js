const routes = require('./index')
const models = require('../_models')
const { migrate, truncate, expressApp, seed, seedValues } = require('../../common/testing/sequelize')
const request = require('supertest')

// Test data
const PROJECT = { id: 'testproject1', name: 'Test project', createdById: seedValues.otherUserId }
const STREAM_1 = { id: 'LilSjZJkRK20', name: 'Test stream', start: '2021-01-02T01:00:00.000Z', end: '2021-01-02T05:00:00.000Z', isPublic: true, createdById: seedValues.otherUserId, projectId: PROJECT.id }
const JOB_1 = { id: 123, projectId: PROJECT.id, queryStreams: 'Test stream, Test stream 2', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', segmentsTotal: 2, segmentsCompleted: 0, status: 0, createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-09-07T08:07:49.158Z', startedAt: null, completedAt: null }

const app = expressApp().use('/', routes)
const superUserApp = expressApp({ is_super: true }).use('/', routes)

beforeAll(async () => {
  await migrate(models.sequelize, models.Sequelize)
  await seed(models)
})
beforeEach(async () => {
  await truncate(models)
  await seedTestData()
})

async function seedTestData () {
  // Projects & users
  await models.Project.bulkCreate([PROJECT])
  await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: PROJECT.id, role_id: seedValues.roleMember })
  await models.UserProjectRole.create({ user_id: seedValues.anotherUserId, project_id: PROJECT.id, role_id: seedValues.roleGuest })

  // Streams
  await models.Stream.bulkCreate([STREAM_1])

  // Jobs
  await models.ClassifierJob.bulkCreate([JOB_1])
}

describe('PATCH /classifier-jobs/:id', () => {
  describe('valid usage', () => {
    test('can update status', async () => {
      // Arrange
      const jobUpdate = { status: 40 }

      // Act
      const response = await request(superUserApp).patch(`/${JOB_1.id}`).send(jobUpdate)
      const jobUpdated = await models.ClassifierJob.findByPk(JOB_1.id)

      // Assert
      expect(response.statusCode).toBe(200)
      expect(jobUpdated.status).toBe(40)
    })
  })

  describe('invalid usage', () => {
    test('normal user cannot update', async () => {
      // Arrange
      const jobUpdate = { status: 40 }

      // Act
      const response = await request(app).patch(`/${JOB_1.id}`).send(jobUpdate)
      const jobUpdated = await models.ClassifierJob.findByPk(JOB_1.id)

      // Assert
      expect(response.statusCode).toBe(403)
      expect(jobUpdated.status).toBe(JOB_1.status)
    })
  })
})

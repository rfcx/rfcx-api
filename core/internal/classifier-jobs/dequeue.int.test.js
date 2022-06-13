const routes = require('.')
const models = require('../../_models')
const { migrate, truncate, expressApp, seed, seedValues } = require('../../../common/testing/sequelize')
const request = require('supertest')
const { randomId } = require('../../../common/crypto/random')

const app = expressApp()

app.use('/', routes)

beforeAll(async () => {
  await migrate(models.sequelize, models.Sequelize)
  await seed(models)
})
beforeEach(async () => {
  await truncate(models)
  await commonSetup()
})

async function commonSetup () {
  const project = { id: randomId(), name: 'Finnish Bears', createdById: seedValues.otherUserId }
  await models.Project.create(project)
  return { project }
}

describe('POST /internal/classifier-jobs/dequeue', () => {
  test('returns an array', async () => {
    const response = await request(app).post('/dequeue')

    expect(response.statusCode).toBe(200)
    expect(Array.isArray(response.body)).toBe(true)
  })

  test('returns the oldest waiting job', async () => {
    const { project } = await commonSetup()
    await models.ClassifierJob.create({ created_at: '2022-01-02 04:10', projectId: project.id, createdById: seedValues.otherUserId })
    const firstJob = await models.ClassifierJob.create({ created_at: '2022-01-02 03:15', projectId: project.id, createdById: seedValues.otherUserId })

    const response = await request(app).post('/dequeue')

    expect(response.body).toHaveLength(1)
    expect(response.body[0].id).toBe(firstJob.id)
  })
})

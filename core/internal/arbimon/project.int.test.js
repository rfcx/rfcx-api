const request = require('supertest')
const routes = require('./project')
const models = require('../../_models')
const { expressApp, seedValues, truncateNonBase } = require('../../../common/testing/sequelize')

const app = expressApp()

app.use('/', routes)

afterEach(async () => {
  await truncateNonBase(models)
})

afterAll(async () => {
  await models.sequelize.close()
})

beforeEach(async () => {
  console.warn = jest.fn()
  await commonSetup()
})

const PROJECT_1 = { id: 'testproj0001', name: 'Test project 1', externalId: 1, createdById: seedValues.primaryUserId }
const PROJECT_2 = { id: 'testproj0002', name: 'Test project 2', externalId: 2, createdById: seedValues.otherUserId }
const PROJECTS = [PROJECT_1, PROJECT_2]

async function commonSetup () {
  await models.Project.bulkCreate(PROJECTS)
  await models.UserProjectRole.bulkCreate(PROJECTS.map(project => { return { project_id: project.id, user_id: project.createdById, role_id: seedValues.roleOwner } }))
}

describe('PATCH /internal/arbimon/projects/:externalId', () => {
  describe('Valid', () => {
    test('with [`name`] params', async () => {
      const body = {
        name: 'New Test project 1'
      }

      const response = await request(app).patch(`/projects/${PROJECT_1.externalId}`).send(body)

      expect(response.statusCode).toBe(200)
      const project = await models.Project.findByPk(PROJECT_1.id)
      expect(project.name).toBe(body.name)
    })

    test('with [`name`, `is_public`] params', async () => {
      const body = {
        name: 'New Test project 1',
        is_public: true
      }

      const response = await request(app).patch(`/projects/${PROJECT_1.externalId}`).send(body)

      expect(response.statusCode).toBe(200)
      const project = await models.Project.findByPk(PROJECT_1.id)
      expect(project.name).toBe(body.name)
      expect(project.isPublic).toBe(body.is_public)
    })
  })
  describe('Invalid', () => {
    test('Invalid Params', async () => {
      const body = {
        name: 'New Test project 1',
        is_public: 123
      }

      const response = await request(app).patch(`/projects/${PROJECT_1.externalId}`).send(body)

      expect(response.statusCode).toBe(400)
    })

    test('Not found Project', async () => {
      const body = {
        name: 'New Test project 1',
        is_public: 123
      }

      const response = await request(app).patch('/projects/123').send(body)

      expect(response.statusCode).toBe(404)
    })
  })
})

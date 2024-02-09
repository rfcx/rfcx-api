const request = require('supertest')
const routes = require('./stream')
const models = require('../_models')
const { expressApp, seedValues, truncateNonBase } = require('../../common/testing/sequelize')

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

const PROJECT_1 = { id: 'testproj0001', name: 'Test project 1', createdById: seedValues.primaryUserId }
const PROJECT_2 = { id: 'testproj0002', name: 'Test project 2', createdById: seedValues.otherUserId }
const PROJECTS = [PROJECT_1, PROJECT_2]

const STREAM_1 = { id: 'LilSjZJkRK43', name: 'Stream 1', projectId: PROJECT_1.id, createdById: seedValues.primaryUserId }
const STREAM_2 = { id: 'LilSjZJkRK44', name: 'Stream 2', projectId: PROJECT_2.id, createdById: seedValues.otherUserId }
const STREAMS = [STREAM_1, STREAM_2]

const INDEX_TYPE_1 = { id: 1, name: 'Raw Acoustic Indices' }
const INDEX_TYPE_2 = { id: 2, name: 'Clustered Indices' }
const INDEX_TYPES = [INDEX_TYPE_1, INDEX_TYPE_2]

const INDEX_1 = { id: 1, code: 'ac', name: 'Acoustic Complexity Index', type_id: INDEX_TYPE_1.id, range_min: 0, range_max: 5000 }
const INDEX_2 = { id: 2, code: 'ad', name: 'Acoustic Diversity Index', type_id: INDEX_TYPE_1.id, range_min: 0, range_max: 5 }
const INDEX_3 = { id: 3, code: 'umap1', name: 'UMAP Dimension 1', type_id: INDEX_TYPE_2.id, range_min: 0, range_max: 1 }
const INDICES = [INDEX_1, INDEX_2, INDEX_3]

const INDEX_VALUE_1 = { time: '2021-04-14T00:00:00.000Z', stream_id: STREAM_1.id, index_id: INDEX_1.id, value: 0.99 }
const INDEX_VALUE_2 = { time: '2021-04-14T01:00:00.000Z', stream_id: STREAM_1.id, index_id: INDEX_2.id, value: 0.88 }
const INDEX_VALUE_3 = { time: '2021-04-14T02:00:00.000Z', stream_id: STREAM_1.id, index_id: INDEX_3.id, value: 0.77 }
const INDEX_VALUE_4 = { time: '2021-04-14T03:00:00.000Z', stream_id: STREAM_1.id, index_id: INDEX_3.id, value: 0.66 }
const INDEX_VALUES = [INDEX_VALUE_1, INDEX_VALUE_2, INDEX_VALUE_3, INDEX_VALUE_4]

async function commonSetup () {
  await models.Project.bulkCreate(PROJECTS)
  await models.UserProjectRole.bulkCreate(PROJECTS.map(project => { return { project_id: project.id, user_id: project.createdById, role_id: seedValues.roleOwner } }))
  await models.Stream.bulkCreate(STREAMS)
  await models.IndexType.bulkCreate(INDEX_TYPES)
  await models.Index.bulkCreate(INDICES)
  await models.IndexValue.bulkCreate(INDEX_VALUES)
}

describe('GET /indices', () => {
  describe('Valid', () => {
    test('with [`start`, `end`] params', async () => {
      const params = {
        start: INDEX_VALUE_1.time,
        end: INDEX_VALUE_2.time
      }

      const response = await request(app).get(`/${STREAM_1.id}/indices/${INDEX_1.code}/values`).query(params)
  
      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(1)
      expect(response.body[0].time).toBe(INDEX_VALUE_1.time)
      expect(response.body[0].value).toBe(INDEX_VALUE_1.value)
    })

    test('with [`start`, `end`] params', async () => {
      const params = {
        start: INDEX_VALUE_3.time,
        end: '2021-04-14T04:00:00.000Z'
      }

      const response = await request(app).get(`/${STREAM_1.id}/indices/${INDEX_3.code}/values`).query(params)
  
      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(2)
      expect(response.body[0].time).toBe(INDEX_VALUE_3.time)
      expect(response.body[0].value).toBe(INDEX_VALUE_3.value)
      expect(response.body[1].time).toBe(INDEX_VALUE_4.time)
      expect(response.body[1].value).toBe(INDEX_VALUE_4.value)
    })
  })
  describe('Invalid', () => {
    test('Invalid Params', async () => {
      const params = {
        start: 'abc',
        end: INDEX_VALUE_3.time
      }

      const response = await request(app).get(`/${STREAM_1.id}/indices/${INDEX_3.code}/values`).query(params)
  
      expect(response.statusCode).toBe(400)
    })

    test('Not found Stream', async () => {
      const params = {
        start: INDEX_VALUE_1.time,
        end: INDEX_VALUE_3.time
      }

      const response = await request(app).get(`/aaaaaaaaaaaa/indices/${INDEX_3.code}/values`).query(params)
  
      expect(response.statusCode).toBe(404)
    })

    test('Forbidden Stream', async () => {
      const params = {
        start: INDEX_VALUE_1.time,
        end: INDEX_VALUE_3.time
      }

      const response = await request(app).get(`/${STREAM_2.id}/indices/${INDEX_3.code}/values`).query(params)
  
      expect(response.statusCode).toBe(403)
    })
  })
})

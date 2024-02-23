const request = require('supertest')
const routes = require('./indices')
const models = require('../../_models')
const indicesService = require('../../indices/dao/values')
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

const STREAM_1 = { id: 'LilSjZJkRK43', name: 'Stream 1', projectId: PROJECT_1.id, externalId: 1, createdById: seedValues.primaryUserId }
const STREAM_2 = { id: 'LilSjZJkRK46', name: 'Stream 2', projectId: PROJECT_2.id, externalId: 2, isPublic: true, createdById: seedValues.otherUserId }
const STREAMS = [STREAM_1, STREAM_2]

const INDEX_TYPE_1 = { id: 1, name: 'Raw Acoustic Indices' }
const INDEX_TYPE_2 = { id: 2, name: 'Clustered Indices' }
const INDEX_TYPES = [INDEX_TYPE_1, INDEX_TYPE_2]

const INDEX_1 = { id: 1, code: 'ac', name: 'Acoustic Complexity Index', type_id: INDEX_TYPE_1.id, range_min: 0, range_max: 5000 }
const INDEX_2 = { id: 2, code: 'ad', name: 'Acoustic Diversity Index', type_id: INDEX_TYPE_1.id, range_min: 0, range_max: 5 }
const INDEX_3 = { id: 3, code: 'umap1', name: 'UMAP Dimension 1', type_id: INDEX_TYPE_2.id, range_min: 0, range_max: 1 }
const INDICES = [INDEX_1, INDEX_2, INDEX_3]

async function commonSetup () {
  await models.Project.bulkCreate(PROJECTS)
  await models.UserProjectRole.bulkCreate(PROJECTS.map(project => { return { project_id: project.id, user_id: project.createdById, role_id: seedValues.roleOwner } }))
  await models.Stream.bulkCreate(STREAMS)
  await models.IndexType.bulkCreate(INDEX_TYPES)
  await models.Index.bulkCreate(INDICES)
}

describe('POST /index-values', () => {
  describe('Valid', () => {
    test('Normal', async () => {
      const body = {
        stream_id: STREAM_1.id,
        time: '2022-06-29 11:22:37.094935',
        index: INDEX_1.code,
        values: [0.99, 0.77],
        step: 1
      }
      const fn = jest.spyOn(indicesService, 'clearHeatmapCache').mockReturnValue('')

      const response = await request(app).post('/index-values').send(body)

      expect(response.statusCode).toBe(201)
      expect(fn).toHaveBeenCalled()
      const indexValue = models.IndexValue.findOne({ where: { stream_id: body.stream_id, index_id: body.index } })
      expect(indexValue).toBeDefined()
    })
  })
  describe('Invalid', () => {
    test('Not found Index', async () => {
      const body = {
        stream_id: STREAM_1.id,
        time: '2022-06-29 11:22:37.094935',
        index: 'abc',
        values: [0.99, 0.77],
        step: 1
      }

      const response = await request(app).post('/index-values').send(body)

      expect(response.statusCode).toBe(404)
      expect(response.body.message).toBe('Index with given code not found')
    })

    test('Invalid Params', async () => {
      const body = {
        stream_id: STREAM_1.id,
        time: '2022-06-29 11:22:37.094935',
        index: INDEX_1.code,
        values: ['abc', 'def'],
        step: 1
      }

      const response = await request(app).post('/index-values').send(body)

      expect(response.statusCode).toBe(400)
    })
  })
})

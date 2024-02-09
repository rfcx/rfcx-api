const request = require('supertest')
const routes = require('.')
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

const INDEX_TYPE_1 = { id: 1, name: 'Raw Acoustic Indices' }
const INDEX_TYPE_2 = { id: 2, name: 'Clustered Indices' }
const INDEX_TYPES = [INDEX_TYPE_1, INDEX_TYPE_2]

const INDEX_1 = { id: 1, code: 'ac', name: 'Acoustic Complexity Index', type_id: INDEX_TYPE_1.id, range_min: 0, range_max: 5000 }
const INDEX_2 = { id: 2, code: 'ad', name: 'Acoustic Diversity Index', type_id: INDEX_TYPE_1.id, range_min: 0, range_max: 5 }
const INDEX_3 = { id: 3, code: 'umap1', name: 'UMAP Dimension 1', type_id: INDEX_TYPE_2.id, range_min: 0, range_max: 1 }
const INDICES = [INDEX_1, INDEX_2, INDEX_3]

async function commonSetup () {
  await models.IndexType.bulkCreate(INDEX_TYPES)
  await models.Index.bulkCreate(INDICES)
}

describe('GET /indices', () => {
  describe('Valid', () => {
    test('Normal', async () => {

      const response = await request(app).get(`/`).query()
  
      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(3)
      expect(response.body[0].code).toBe(INDEX_1.code)
      expect(response.body[1].code).toBe(INDEX_2.code)
      expect(response.body[2].code).toBe(INDEX_3.code)
    })

    test('with [`limit`] params', async () => {
      const params = {
        limit: 1
      }

      const response = await request(app).get(`/`).query(params)
  
      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(1)
      expect(response.body[0].code).toBe(INDEX_1.code)
    })

    test('with [`offset`] params', async () => {
      const params = {
        offset: 1
      }

      const response = await request(app).get(`/`).query(params)
  
      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(2)
      expect(response.body[0].code).toBe(INDEX_2.code)
      expect(response.body[1].code).toBe(INDEX_3.code)
    })

    test('with [`limit`, `offset`] params', async () => {
      const params = {
        limit: 1,
        offset: 1
      }

      const response = await request(app).get(`/`).query(params)
  
      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(1)
      expect(response.body[0].code).toBe(INDEX_2.code)
    })
  })
  describe('Invalid', () => {
    test('Invalid Params', async () => {
      const params = {
        limit: 'abc',
        offset: 1
      }

      const response = await request(app).get(`/`).query(params)
  
      expect(response.statusCode).toBe(400)
    })
  })
})

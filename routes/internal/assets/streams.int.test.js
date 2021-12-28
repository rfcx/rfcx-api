const routes = require('./streams')
const models = require('../../../modelsTimescale')
const { migrate, truncate, expressApp, seed, seedValues } = require('../../../utils/sequelize/testing')
const request = require('supertest')

const app = expressApp()

app.use('/', routes)

beforeAll(async () => {
  await migrate(models.sequelize, models.Sequelize)
  await seed(models)
})
beforeEach(async () => {
  await truncate(models)
})

describe('GET /internal/assets/streams/:partialFileDescription', () => {
  test('stream not found', async () => {
    console.warn = jest.fn()

    // TODO There is a bug that the last parameter `fwav` is getting parsed as `fwav.wav`
    const response = await request(app).get('/streams/1234_t20191227T134400000Z.20191227T134420000Z_fwav.wav').set('Content-Type', 'audio/wav')

    expect(response.statusCode).toBe(404)
    expect(console.warn).toHaveBeenCalled()
  })

  test('segment not found', async () => {
    console.warn = jest.fn()
    const stream = { id: 'j123s', createdById: seedValues.primaryUserId, name: 'Jaguar Station', latitude: 10.1, longitude: 101.1, altitude: 200 }
    await models.Stream.create(stream)

    const response = await request(app).get(`/streams/${stream.id}_t20191227T134400000Z.20191227T134420000Z_fwav.wav`).set('Content-Type', 'audio/wav')

    expect(response.statusCode).toBe(404)
    expect(console.warn).toHaveBeenCalled()
  })
})

const routes = require('.')
const models = require('../../../modelsTimescale')
const { migrate, truncate, expressApp, seed, seedValues, muteConsole } = require('../../../utils/sequelize/testing')
const request = require('supertest')

const app = expressApp()

app.use('/', routes)

beforeAll(async () => {
  muteConsole()
  await migrate(models.sequelize, models.Sequelize)
  await seed(models)
})
beforeEach(async () => {
  await truncate(models)
})

describe('GET /streams/:id/segments', () => {
  test('stream not found', async () => {
    const response = await request(app).get('/xxx/segments').query({ start: '2021-07-26T10:10:10Z', end: '2021-07-26T10:10:10Z' })

    expect(response.statusCode).toBe(404)
  })

  test('segments not found', async () => {
    const stream = await models.Stream.create({ id: 'j123s', name: 'Jaguar Station', latitude: 10.1, longitude: 101.1, createdById: seedValues.primaryUserId })

    const response = await request(app).get(`/${stream.id}/segments`).query({ start: '2021-07-26T10:10:10Z', end: '2021-07-26T10:10:10Z' })

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual([])
  })

  test('single result', async () => {
    const stream = await models.Stream.create({ id: 'j123s', name: 'Jaguar Station', latitude: 10.1, longitude: 101.1, createdById: seedValues.primaryUserId })
    const sourceFile = await models.StreamSourceFile.create({ stream_id: stream.id, filename: '20210726_101010.wav', duration: 60, sample_count: 720000, sample_rate: 12000, channels_count: 1, bit_rate: 1, audio_codec_id: 1, audio_file_format_id: 1 })
    const segment = await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:10:10Z', emd: '2021-07-26T10:11:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: 1 })
    
    const response = await request(app).get(`/${stream.id}/segments`)

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].id).toBe(segment.id)
    expect(response.body[0].start).toBe(segment.start)
  })
})

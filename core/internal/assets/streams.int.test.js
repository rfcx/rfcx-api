const routes = require('./streams')
const models = require('../../../models')
const { migrate, truncate, expressApp, seed, seedValues } = require('../../../common/testing/sequelize')
const request = require('supertest')

jest.mock('../../_services/streams/segment-utils/segment-file-utils', () => (
  {
    getFile: (_req, res) => {
      res.sendStatus(200)
      return Promise.resolve()
    }
  })
)

const app = expressApp()

app.use('/', routes)

beforeAll(async () => {
  await migrate(models.sequelize, models.Sequelize)
  await seed(models)
})
beforeEach(async () => {
  await truncate(models)
})

async function commonSetup () {
  await models.AudioFileFormat.create({ id: 1, value: 'wav' })
  await models.AudioCodec.create({ id: 1, value: 'wav' })
  await models.FileExtension.create({ id: 1, value: '.wav' })
  const stream = await models.Stream.create({ id: 'abc123', name: 'Magpies Nest', latitude: 14.1, longitude: 141.1, createdById: seedValues.primaryUserId })
  const sourceFile = await models.StreamSourceFile.create({ stream_id: stream.id, filename: '20210726_101000.wav', duration: 600, sample_count: 1, sample_rate: 12000, channels_count: 1, bit_rate: 1, audio_codec_id: 1, audio_file_format_id: 1 })
  const segments = await Promise.all([
    { stream_id: stream.id, start: '2021-07-26T10:10:00.000Z', end: '2021-07-26T10:10:59.999Z', stream_source_file_id: sourceFile.id, sample_count: 1, file_extension_id: 1 },
    { stream_id: stream.id, start: '2021-07-26T10:11:00.000Z', end: '2021-07-26T10:11:59.999Z', stream_source_file_id: sourceFile.id, sample_count: 1, file_extension_id: 1 }
  ].map(segment => models.StreamSegment.create(segment)))
  return { stream, segments }
}

describe('GET /internal/assets/streams/:attributes', () => {
  test('stream not found', async () => {
    console.warn = jest.fn()

    const response = await request(app).get('/streams/1234_t20191227T134400000Z.20191227T134420000Z_fwav.wav')

    expect(response.statusCode).toBe(404)
    expect(console.warn).toHaveBeenCalled()
  })

  test('segment not found', async () => {
    const stream = { id: 'j123s', createdById: seedValues.primaryUserId, name: 'Jaguar Station', latitude: 10.1, longitude: 101.1, altitude: 200 }
    await models.Stream.create(stream)

    const response = await request(app).get(`/streams/${stream.id}_t20191227T134400000Z.20191227T134420000Z_fwav.wav`)

    expect(response.statusCode).toBe(404)
  })

  test('segment found', async () => {
    const { stream } = await commonSetup()

    const response = await request(app).get(`/streams/${stream.id}_t20210726T101000Z.20210726T101030Z_fwav.wav`)

    expect(response.statusCode).toBe(200)
  })

  test('invalid file type', async () => {
    const { stream } = await commonSetup()

    const response = await request(app).get(`/streams/${stream.id}_t20210726T101000Z.20210726T101030Z_fdocx.wav`)

    expect(response.statusCode).toBe(400)
  })
})

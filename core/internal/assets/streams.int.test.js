const routes = require('./streams')
const models = require('../../_models')
const { expressApp, seedValues, truncateNonBase } = require('../../../common/testing/sequelize')
const request = require('supertest')

// `isCached` is driven per-test so the HEAD route can be exercised for both
// cache states without a storage backend. It MUST be mocked alongside getFile:
// a partial mock would leave it undefined and the HEAD route would throw.
let mockCached = false

jest.mock('../../../core/stream-segments/bl/segment-file-utils', () => (
  {
    getFile: (_req, res) => {
      res.sendStatus(200)
      return Promise.resolve()
    },
    isCached: () => Promise.resolve({ cached: mockCached })
  })
)

const app = expressApp()

app.use('/', routes)

afterEach(async () => {
  await truncateNonBase(models)
})

afterAll(async () => {
  await models.sequelize.close()
})

async function commonSetup () {
  await models.AudioFileFormat.create({ id: 1, value: 'wav' })
  await models.AudioCodec.create({ id: 1, value: 'wav' })
  await models.FileExtension.create({ id: 1, value: '.wav' })
  const stream = await models.Stream.create({ id: 'abc123', name: 'Magpies Nest', latitude: 14.1, longitude: 141.1, createdById: seedValues.primaryUserId })
  await models.UserStreamRole.create({ stream_id: stream.id, user_id: stream.createdById, role_id: seedValues.roleOwner })
  const sourceFile = await models.StreamSourceFile.create({ stream_id: stream.id, filename: '20210726_101000.wav', duration: 600, sample_count: 1, sample_rate: 12000, channels_count: 1, bit_rate: 1, audio_codec_id: 1, audio_file_format_id: 1 })
  const segments = await Promise.all([
    { stream_id: stream.id, start: '2021-07-26T10:10:00.000Z', end: '2021-07-26T10:10:59.999Z', stream_source_file_id: sourceFile.id, sample_count: 1, file_extension_id: 1, availability: 1 },
    { stream_id: stream.id, start: '2021-07-26T10:11:00.000Z', end: '2021-07-26T10:11:59.999Z', stream_source_file_id: sourceFile.id, sample_count: 1, file_extension_id: 1, availability: 1 },
    { stream_id: stream.id, start: '2021-07-26T10:12:00.000Z', end: '2021-07-26T10:12:59.999Z', stream_source_file_id: sourceFile.id, sample_count: 1, file_extension_id: 1, availability: 0 }
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
    await models.UserStreamRole.create({ stream_id: stream.id, user_id: stream.createdById, role_id: seedValues.roleOwner })

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

  test('segments unavailable', async () => {
    const { stream } = await commonSetup()

    const response = await request(app).get(`/streams/${stream.id}_t20210726T101200Z.20210726T101230Z_fwav.wav`)

    expect(response.statusCode).toBe(404)
    expect(response.body.message).toBe('Unavailable')
  })

  test('some available and some unavailable segments', async () => {
    const { stream } = await commonSetup()

    const response = await request(app).get(`/streams/${stream.id}_t20210726T101000Z.20210726T101230Z_fwav.wav`)

    expect(response.statusCode).toBe(404)
    expect(response.body.message).toBe('Unavailable')
  })
})

// HEAD (rfcx-local, 2026-08-21). Until this route existed, Express dispatched
// HEAD to the GET handler, so a "probe" ran the full render pipeline and cached
// the result. These assert the two properties that matter:
//   1. HEAD mirrors GET's STATUS (RFC 9110) -- it does NOT use 404 to mean
//      "not cached", which would tell clients the asset does not exist.
//   2. Cache state is reported in the RFCx-Media-Cache header, and it tracks
//      the underlying cache lookup rather than being hard-coded.
describe('HEAD /internal/assets/streams/:attributes', () => {
  beforeEach(() => { mockCached = false })

  test('reports MISS when the asset is renderable but not cached', async () => {
    const { stream } = await commonSetup()
    mockCached = false

    const response = await request(app).head(`/streams/${stream.id}_t20210726T101000Z.20210726T101030Z_fwav.wav`)

    expect(response.statusCode).toBe(200)
    expect(response.headers['rfcx-media-cache']).toBe('MISS')
  })

  test('reports HIT when the asset is already cached', async () => {
    const { stream } = await commonSetup()
    mockCached = true

    const response = await request(app).head(`/streams/${stream.id}_t20210726T101000Z.20210726T101030Z_fwav.wav`)

    expect(response.statusCode).toBe(200)
    expect(response.headers['rfcx-media-cache']).toBe('HIT')
  })

  test('mirrors GET: 404 when no segments in range (NOT a cache answer)', async () => {
    const stream = { id: 'h123s', createdById: seedValues.primaryUserId, name: 'Head Station', latitude: 10.1, longitude: 101.1, altitude: 200 }
    await models.Stream.create(stream)
    await models.UserStreamRole.create({ stream_id: stream.id, user_id: stream.createdById, role_id: seedValues.roleOwner })

    const response = await request(app).head(`/streams/${stream.id}_t20191227T134400000Z.20191227T134420000Z_fwav.wav`)

    expect(response.statusCode).toBe(404)
    expect(response.headers['rfcx-media-cache']).toBeUndefined()
  })

  test('mirrors GET: 404 for unavailable segments', async () => {
    const { stream } = await commonSetup()
    mockCached = true // must NOT be reported: availability gate comes first

    const response = await request(app).head(`/streams/${stream.id}_t20210726T101200Z.20210726T101230Z_fwav.wav`)

    expect(response.statusCode).toBe(404)
    expect(response.headers['rfcx-media-cache']).toBeUndefined()
  })

  test('mirrors GET: 400 on an invalid file type', async () => {
    const { stream } = await commonSetup()

    const response = await request(app).head(`/streams/${stream.id}_t20210726T101000Z.20210726T101030Z_fdocx.wav`)

    expect(response.statusCode).toBe(400)
  })

  test('spec assets report cache state too', async () => {
    const { stream } = await commonSetup()
    mockCached = true

    const response = await request(app).head(`/streams/${stream.id}_t20210726T101000Z.20210726T101030Z_r100.2000_g1_fspec_d400.400_wdolph_z120_mtrue.png`)

    expect(response.statusCode).toBe(200)
    expect(response.headers['rfcx-media-cache']).toBe('HIT')
  })
})

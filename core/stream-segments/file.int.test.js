const routes = require('.')
const models = require('../_models')
const { truncateNonBase, expressApp, seedValues } = require('../../common/testing/sequelize')
const request = require('supertest')
const storageService = require('../_services/storage')

const app = expressApp()

app.use('/', routes)

jest.spyOn(storageService, 'getSignedUrl').mockImplementation((bucket, key, contentType, expires = 86400, write = false) => {
  return Promise.resolve(`https://fake-s3/${bucket}/${key}?extra=stuff`)
})

afterEach(async () => {
  await truncateNonBase(models)
})

afterAll(async () => {
  await models.sequelize.close()
})

async function commonSetup () {
  const audioFileFormat = { id: 1, value: 'wav' }
  await models.AudioFileFormat.create(audioFileFormat)
  const audioCodec = { id: 1, value: 'wav' }
  await models.AudioCodec.create(audioCodec)
  const fileExtension = { id: 1, value: '.wav' }
  await models.FileExtension.create(fileExtension)
}

describe('GET /streams/:id/segments/:start/file', () => {
  test('segment found', async () => {
    await commonSetup()
    const stream = await models.Stream.create({ id: 'j123s', name: 'Jaguar Station', latitude: 10.1, longitude: 101.1, createdById: seedValues.primaryUserId })
    await models.UserStreamRole.create({ stream_id: stream.id, user_id: stream.createdById, role_id: seedValues.roleOwner })
    const sourceFile = await models.StreamSourceFile.create({ stream_id: stream.id, filename: '20210726_101010.wav', duration: 60, sample_count: 720000, sample_rate: 12000, channels_count: 1, bit_rate: 1, audio_codec_id: 1, audio_file_format_id: 1 })
    const segment = await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:10:10.000Z', end: '2021-07-26T10:11:09.999Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: 1, availability: 1 })

    const response = await request(app).get(`/${stream.id}/segments/20210726T101010000Z/file`)

    expect(response.statusCode).toBe(302)
    expect(response.header.location).toContain(`2021/07/26/${stream.id}/${segment.id}.wav`)
  })
})

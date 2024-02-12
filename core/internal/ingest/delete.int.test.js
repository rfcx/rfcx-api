const request = require('supertest')
const routes = require('./delete')
const models = require('../../_models')
const { expressApp, seedValues, muteConsole, truncateNonBase } = require('../../../common/testing/sequelize')

const app = expressApp()

app.use('/', routes)

beforeAll(async () => {
  muteConsole()
})

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

const AUDIO_FILE_FORMAT_1 = { id: 1, value: 'wav' }
const AUDIO_FILE_FORMATS = [AUDIO_FILE_FORMAT_1]

const AUDIO_CODEC_1 = { id: 1, value: 'wav' }
const AUDIO_CODECS = [AUDIO_CODEC_1]

const FILE_EXTENSION_1 = { id: 1, value: '.wav' }
const FILE_EXTENSIONS = [FILE_EXTENSION_1]

const SOURCE_FILE_1 = { id: 'aaaaaaaa-bbbb-cccc-dddd-000000000001', stream_id: STREAM_1.id, filename: '20210726_101010.wav', duration: 60, sample_count: 720000, sample_rate: 12000, channels_count: 1, bit_rate: 1, audio_codec_id: AUDIO_CODEC_1.id, audio_file_format_id: AUDIO_FILE_FORMAT_1.id, sha1_checksum: 'b37530881c7ffd9edfd8f7feb131ae4563e3759f' }
const SOURCE_FILES = [SOURCE_FILE_1]

const SEGMENT_1 = { id: 'aaaaaaaa-bbbb-cccc-ffff-000000000001', stream_id: STREAM_1.id, start: '2021-07-26T10:10:10Z', end: '2021-07-26T10:11:10Z', stream_source_file_id: SOURCE_FILE_1.id, sample_count: 720000, file_extension_id: FILE_EXTENSION_1.id, availability: 1, path: 'path/to/file' }
const SEGMENTS = [SEGMENT_1]

async function commonSetup () {
  await models.Project.bulkCreate(PROJECTS)
  await models.UserProjectRole.bulkCreate(PROJECTS.map(project => { return { project_id: project.id, user_id: project.createdById, role_id: seedValues.roleOwner } }))
  await models.Stream.bulkCreate(STREAMS)
  await models.AudioFileFormat.bulkCreate(AUDIO_FILE_FORMATS)
  await models.AudioCodec.bulkCreate(AUDIO_CODECS)
  await models.FileExtension.bulkCreate(FILE_EXTENSIONS)
  await models.StreamSourceFile.bulkCreate(SOURCE_FILES)
  await models.StreamSegment.bulkCreate(SEGMENTS)
}

describe('DELETE /streams/:id/stream-source-file-and-segments', () => {
  describe('Valid', () => {
    test('Normal', async () => {
      const body = {
        stream_source_file: {
          id: SOURCE_FILE_1.id
        },
        stream_segments: [
          {
            id: SEGMENT_1.id,
            start: SEGMENT_1.start,
            path: SEGMENT_1.path
          }
        ]
      }

      const response = await request(app).delete(`/streams/${STREAM_1.id}/stream-source-file-and-segments`).send(body)

      expect(response.statusCode).toBe(204)
      const segments = await models.StreamSegment.findAll()
      const sourceFiles = await models.StreamSourceFile.findAll()
      expect(segments.length).toBe(0)
      expect(sourceFiles.length).toBe(0)
    })
  })
  describe('Invalid', () => {
    test('Invalid Params missing stream_segments.path', async () => {
      const body = {
        stream_source_file: {
          id: SOURCE_FILE_1.id
        },
        stream_segments: [
          {
            id: SEGMENT_1.id,
            start: SEGMENT_1.start
          }
        ]
      }

      const response = await request(app).delete(`/streams/${STREAM_1.id}/stream-source-file-and-segments`).send(body)

      expect(response.statusCode).toBe(400)
    })

    test('Invalid Params missing stream_segments', async () => {
      const body = {
        stream_source_file: {
          id: SOURCE_FILE_1.id
        }
      }

      const response = await request(app).delete(`/streams/${STREAM_1.id}/stream-source-file-and-segments`).send(body)

      expect(response.statusCode).toBe(400)
    })
  })
})

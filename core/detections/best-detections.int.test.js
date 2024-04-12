const request = require('supertest')
const { expressApp, seedValues, truncateNonBase } = require('../../common/testing/sequelize')
const { updateBestDetections } = require('./bl/index')
const { REVIEW_STATUS_MAPPING } = require('./dao/review')
const models = require('../_models')
const router = require('./best-detections')

const app = expressApp()

app.use('/', router)

const project = { id: 'moo', name: 'my project', createdById: seedValues.primaryUserId }
const streams = [
  { id: 'aaa', name: 'fist stream', createdById: seedValues.primaryUserId, projectId: project.id },
  { id: 'bbb', name: 'second stream', createdById: seedValues.primaryUserId, projectId: project.id },
  { id: 'ccc', name: 'third stream', createdById: seedValues.primaryUserId, projectId: project.id }
]
const classifications = [
  { id: 7, value: 'woodpecker', title: 'Woodpecker', typeId: 1, sourceId: null },
  { id: 8, value: 'frog', title: 'Frog', typeId: 1, sourceId: 1 }
]
const classifiers = [
  { id: 4, externalId: 'q1q2q3q4', name: 'first model', version: 1, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: 's3://something1' },
  { id: 5, externalId: 'f1f3f3g4', name: 'second model', version: 1, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: 's3://something1' }
]
let classifierJobs = [
  { created_at: '2022-04-01 04:10', classifierId: classifiers[0].id, projectId: project.id, createdById: seedValues.primaryUserId, queryStart: '2024-01-01', queryEnd: '2024-05-01' },
  { created_at: '2022-04-01 05:10', classifierId: classifiers[1].id, projectId: project.id, createdById: seedValues.primaryUserId, queryStart: '2024-01-01', queryEnd: '2024-05-01' }
]

afterAll(async () => {
  await models.BestDetection.destroy({ where: {} })
  await models.Detection.destroy({ where: {} })
})

function oneDetection (partialDetection) {
  return {
    streamId: streams[0].id,
    classifierId: classifiers[0].id,
    end: new Date('2024-04-10T09:00:05.000Z').toISOString(),
    classificationId: classifications[0].id,
    classifierJobId: classifierJobs[0].id,
    confidence: 0.7,
    ...partialDetection
  }
}

let stream1Day1BestDetection
let stream1Day2BestDetection
let stream1Day3BestDetection
let stream2Day1BestDetection
let stream2Day2BestDetection
let stream2Day3BestDetection

let job2Stream1Day1BestDetection
let job2Stream1Day2BestDetection

async function makeManyDetections () {
  const arbitraryDetections = []
  streams.forEach((stream) => {
    // we want 6 days of detections, 4 detections each day
    for (let day = 1; day < 7; day++) {
      let date = new Date('2024-01-01T08:00:00.000Z').setUTCDate(day).valueOf()

      for (let i = 0; i < 30; i++) {
        arbitraryDetections.push(oneDetection({
          streamId: stream.id,
          start: new Date(date),
          end: new Date(date + 5000),
          confidence: 0.7 + Math.random() / 10
        }))

        date += 60 * 60 * 1000
      }
    }
  })

  stream1Day1BestDetection = oneDetection({
    streamId: streams[0].id,
    start: new Date('2024-01-01T09:00:00.000Z'),
    confidence: 0.91,
    reviewStatus: REVIEW_STATUS_MAPPING.confirmed
  })
  stream1Day2BestDetection = oneDetection({
    streamId: streams[0].id,
    start: new Date('2024-01-02T11:00:00.000Z'),
    confidence: 0.92,
    reviewStatus: REVIEW_STATUS_MAPPING.rejected
  })
  stream1Day3BestDetection = oneDetection({
    streamId: streams[0].id,
    start: new Date('2024-01-03T11:00:00.000Z'),
    confidence: 0.93,
    reviewStatus: REVIEW_STATUS_MAPPING.uncertain
  })

  stream2Day1BestDetection = oneDetection({
    streamId: streams[1].id,
    start: new Date('2024-01-01T09:00:00.000Z'),
    confidence: 0.92
  })
  stream2Day2BestDetection = oneDetection({
    streamId: streams[1].id,
    start: new Date('2024-01-02T11:00:00.000Z'),
    confidence: 0.91
  })
  stream2Day3BestDetection = oneDetection({
    streamId: streams[1].id,
    start: new Date('2024-01-03T11:00:00.000Z'),
    confidence: 0.93
  })

  // these detections are best, but should not present in results
  job2Stream1Day1BestDetection = oneDetection({
    streamId: streams[0].id,
    start: new Date('2024-01-01T09:00:00.000Z'),
    confidence: 0.99,
    classifierJobId: classifierJobs[1].id
  })

  job2Stream1Day2BestDetection = oneDetection({
    streamId: streams[0].id,
    start: new Date('2024-01-02T11:00:00.000Z'),
    confidence: 0.98,
    classifierJobId: classifierJobs[1].id
  })

  await models.Detection.bulkCreate(arbitraryDetections)
  const bestDetectionArray = [
    stream1Day1BestDetection,
    stream1Day2BestDetection,
    stream1Day3BestDetection,
    stream2Day1BestDetection,
    stream2Day2BestDetection,
    stream2Day3BestDetection,
    job2Stream1Day1BestDetection,
    job2Stream1Day2BestDetection
  ]

  const bestDetections = await models.Detection.bulkCreate(bestDetectionArray)

  bestDetections.forEach((item, index) => {
    bestDetectionArray[index].id = item.id
  })
}

beforeAll(async () => {
  await truncateNonBase()

  await models.Project.create(project)
  await models.Stream.bulkCreate(streams)
  await models.Classification.bulkCreate(classifications)
  await models.Classifier.bulkCreate(classifiers)
  classifierJobs = await models.ClassifierJob.bulkCreate(classifierJobs)

  await makeManyDetections()
  await Promise.all(
    classifierJobs.map(job => updateBestDetections(job))
  )
})

test('should return right best per stream detections', async () => {
  const query = {
    n_per_stream: 2
  }

  const response = await request(app).get(`/${classifierJobs[0].id}/best-detections`).query(query)
  const items = response.body

  expect(response.statusCode).toBe(200)
  expect(items).toHaveLength(6) // 3 streams with 2 best per stream
  expect(items[0].id).toBe(stream1Day1BestDetection.id)
  expect(items[1].id).toBe(stream1Day2BestDetection.id)
  expect(items[2].id).toBe(stream2Day2BestDetection.id)
  expect(items[3].id).toBe(stream2Day1BestDetection.id)
})

test('should return right best per day detections', async () => {
  const query = {
    by_date: true,
    n_per_stream: 2,
    start: '2024-01-01T00:00:00.000Z',
    end: '2024-01-04T00:00:00.000Z'
  }

  const response = await request(app).get(`/${classifierJobs[0].id}/best-detections`).query(query)
  const items = response.body

  expect(response.statusCode).toBe(200)
  expect(items).toHaveLength(18) // 3 full days, 3 streams, 2 items per day per stream
  expect(items[0].id).toBe(stream1Day2BestDetection.id)
  // skipping first stream first day second best
  expect(items[2].id).toBe(stream2Day1BestDetection.id)
  // skipping second stream first day second best (element 3)
  // skipping stream 3 (elements 4 and 5)

  expect(items[6].id).toBe(stream1Day2BestDetection.id)
  expect(items[8].id).toBe(stream2Day2BestDetection.id)

  expect(items[12].id).toBe(stream1Day3BestDetection.id)
  expect(items[14].id).toBe(stream2Day3BestDetection.id)
})

test('should respect stream_ids in best per day', async () => {
  const query = {
    by_date: true,
    n_per_stream: 1,
    start: '2024-01-01T00:00:00.000Z',
    end: '2024-01-04T00:00:00.000Z',
    streams: [streams[0].id, streams[1].id]
  }

  const response = await request(app).get(`/${classifierJobs[0].id}/best-detections`).query(query)
  const items = response.body

  expect(items).toHaveLength(6) // 2 streams, 3 days, 1 result per day
})

test('should respect stream_ids in best per stream', async () => {
  const query = {
    by_date: false,
    n_per_stream: 2,
    streams: [streams[0].id, streams[1].id]
  }

  const response = await request(app).get(`/${classifierJobs[0].id}/best-detections`).query(query)
  const items = response.body

  expect(items).toHaveLength(4) // 2 streams, 2 results per day
})

test('should respect review statuses', async () => {
  const query = {
    by_date: false,
    n_per_stream: 10, // max
    review_statuses: ['uncertain', 'confirmed']
  }

  const response = await request(app).get(`/${classifierJobs[0].id}/best-detections`).query(query)
  const items = response.body

  expect(items).toHaveLength(2) // only has 2
  expect(items[0].id).toBe(stream1Day1BestDetection.id)
  expect(items[1].id).toBe(stream1Day3BestDetection.id)
})

test('should only find detections in requested job', async () => {
  const query = {
    by_date: false,
    n_per_stream: 10 // max
  }

  const response = await request(app).get(`/${classifierJobs[1].id}/best-detections`).query(query)
  const items = response.body

  expect(items).toHaveLength(2) // only has 2
  expect(items[0].id).toBe(job2Stream1Day1BestDetection.id)
  expect(items[1].id).toBe(job2Stream1Day1BestDetection.id)
})

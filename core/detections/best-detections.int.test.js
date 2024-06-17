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

let stream1Day1BestWoodpecker
let stream1Day1BestFrog
let stream1Day2BestWoodpecker
let stream1Day2BestFrog
let stream1Day3BestWoodpecker
let stream1Day3BestFrog
let stream2Day1BestDetection
let stream2Day2BestDetection
let stream2Day3BestDetection

let job2Stream1Day1BestDetection
let job2Stream1Day2BestDetection

async function makeManyDetections () {
  const arbitraryDetections = []
  streams.forEach((stream) => {
    classifications.forEach((classification) => {
      // we want 6 days of detections, 20 detections each day per classification
      for (let day = 1; day < 7; day++) {
        let date = new Date('2024-01-01T08:00:00.000Z').setUTCDate(day).valueOf()

        for (let i = 0; i < 20; i++) {
          arbitraryDetections.push(oneDetection({
            streamId: stream.id,
            start: new Date(date),
            classificationId: classification.id,
            end: new Date(date + 5000),
            confidence: 0.7 + Math.random() / 10
          }))

          date += 60 * 60 * 1000
        }
      }
    })
  })

  stream1Day1BestWoodpecker = oneDetection({
    streamId: streams[0].id,
    start: new Date('2024-01-01T09:00:00.000Z'),
    classificationId: classifications[0].id,
    confidence: 0.91,
    reviewStatus: REVIEW_STATUS_MAPPING.confirmed
  })
  stream1Day1BestFrog = oneDetection({
    streamId: streams[0].id,
    start: new Date('2024-01-01T09:30:00.000Z'),
    classificationId: classifications[1].id,
    confidence: 0.915,
    reviewStatus: REVIEW_STATUS_MAPPING.confirmed
  })
  stream1Day2BestWoodpecker = oneDetection({
    streamId: streams[0].id,
    start: new Date('2024-01-02T11:00:00.000Z'),
    classificationId: classifications[0].id,
    confidence: 0.92,
    reviewStatus: REVIEW_STATUS_MAPPING.rejected
  })
  stream1Day2BestFrog = oneDetection({
    streamId: streams[0].id,
    start: new Date('2024-01-02T11:30:00.000Z'),
    classificationId: classifications[1].id,
    confidence: 0.925,
    reviewStatus: REVIEW_STATUS_MAPPING.rejected
  })
  stream1Day3BestWoodpecker = oneDetection({
    streamId: streams[0].id,
    start: new Date('2024-01-03T11:00:00.000Z'),
    classificationId: classifications[0].id,
    confidence: 0.93,
    reviewStatus: REVIEW_STATUS_MAPPING.uncertain
  })
  stream1Day3BestFrog = oneDetection({
    streamId: streams[0].id,
    start: new Date('2024-01-03T11:30:00.000Z'),
    classificationId: classifications[1].id,
    confidence: 0.935,
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
    stream1Day1BestWoodpecker,
    stream1Day1BestFrog,
    stream1Day2BestWoodpecker,
    stream1Day2BestFrog,
    stream1Day3BestWoodpecker,
    stream1Day3BestFrog,
    stream2Day1BestDetection,
    stream2Day2BestDetection,
    stream2Day3BestDetection,
    job2Stream1Day1BestDetection,
    job2Stream1Day2BestDetection
  ]

  const bestDetections = await models.Detection.bulkCreate(bestDetectionArray)

  bestDetections.forEach((item, index) => {
    bestDetectionArray[index].id = item.dataValues.id
  })
}

beforeAll(async () => {
  await truncateNonBase(models)
  await models.ClassifierJob.destroy({ where: {}, force: true })
  await models.Classifier.destroy({ where: {}, force: true })

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
    n_per_chunk: 2
  }

  const response = await request(app).get(`/${classifierJobs[0].id}/best-detections`).query(query)
  const items = response.body

  expect(response.statusCode).toBe(200)
  expect(items).toHaveLength(6) // 3 streams with 2 best per stream
  expect(items[0].confidence).toBe(stream1Day3BestFrog.confidence)
  expect(items[1].confidence).toBe(stream1Day3BestWoodpecker.confidence)
  expect(items[2].confidence).toBe(stream2Day3BestDetection.confidence)
  expect(items[3].confidence).toBe(stream2Day1BestDetection.confidence)
})

test('should return right best per day detections', async () => {
  const query = {
    by_date: true,
    n_per_chunk: 2,
    start: '2024-01-01T00:00:00.000Z',
    end: '2024-01-04T00:00:00.000Z'
  }

  const response = await request(app).get(`/${classifierJobs[0].id}/best-detections`).query(query)
  const items = response.body

  expect(response.statusCode).toBe(200)
  expect(items).toHaveLength(18) // 3 full days, 3 streams, 2 items per day per stream
  expect(items[0].id).toBe(stream1Day1BestFrog.id)
  // skipping first stream first day second best
  expect(items[2].id).toBe(stream2Day1BestDetection.id)
  // skipping second stream first day second best (element 3)
  // skipping stream 3 (elements 4 and 5)

  expect(items[6].id).toBe(stream1Day2BestFrog.id)
  expect(items[8].id).toBe(stream2Day2BestDetection.id)

  expect(items[12].id).toBe(stream1Day3BestFrog.id)
  expect(items[14].id).toBe(stream2Day3BestDetection.id)
})

test('should respect streams and classifications in best per day', async () => {
  const query = {
    by_date: true,
    n_per_chunk: 1,
    start: '2024-01-01T00:00:00.000Z',
    end: '2024-01-04T00:00:00.000Z',
    streams: [streams[0].id, streams[1].id],
    classifications: [classifications[1].id]
  }

  const response = await request(app).get(`/${classifierJobs[0].id}/best-detections`).query(query)
  const items = response.body

  expect(items).toHaveLength(6) // 2 streams, 3 days, 1 result per day
  items.forEach((item) => {
    expect(item.classification.value).toBe(classifications[1].value)
  })
})

test('should respect stream_ids in best per day', async () => {
  const query = {
    by_date: true,
    n_per_chunk: 1,
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
    n_per_chunk: 2,
    streams: [streams[0].id, streams[1].id]
  }

  const response = await request(app).get(`/${classifierJobs[0].id}/best-detections`).query(query)
  const items = response.body

  expect(items).toHaveLength(4) // 2 streams, 2 results per day
})

test('should respect classifications in best per stream', async () => {
  const query = {
    by_date: false,
    n_per_chunk: 2,
    classifications: [classifications[0].id]
  }

  const response = await request(app).get(`/${classifierJobs[0].id}/best-detections`).query(query)
  const items = response.body

  expect(items).toHaveLength(6) // 3 streams, 2 results per day
  expect(items[0].start).toBe(stream1Day3BestWoodpecker.start.toISOString())
  expect(items[1].start).toBe(stream1Day2BestWoodpecker.start.toISOString())
})

test('should respect review statuses', async () => {
  const query = {
    by_date: false,
    n_per_chunk: 10, // max
    review_statuses: ['uncertain', 'confirmed']
  }

  const response = await request(app).get(`/${classifierJobs[0].id}/best-detections`).query(query)
  const items = response.body

  expect(items).toHaveLength(4) // only has 4 (2 frogs and 2 woodpeckers)
  expect(items[0].id).toBe(stream1Day3BestFrog.id)
  expect(items[1].id).toBe(stream1Day3BestWoodpecker.id)
})

test('fields support works as expected', async () => {
  const query = {
    by_date: true,
    n_per_chunk: 2,
    fields: [
      'id',
      'confidence',
      'start',
      'review_status'
    ]
  }

  const response = await request(app).get(`/${classifierJobs[0].id}/best-detections`).query(query)
  const items = response.body

  expect(items[0].id).toBeDefined()
  expect(items[0].confidence).toBeDefined()
  expect(items[0].start).toBeDefined()
  expect(items[0].review_status).toBeDefined()
  expect(items[0].classification).toBeDefined()
  expect(items[0].end).not.toBeDefined()
})

test('should respect pagination parameters for dayly request', async () => {
  const query = {
    by_date: true,
    n_per_chunk: 6,
    start: '2024-01-01T00:00:00.000Z',
    end: '2024-01-07T00:00:00.000Z',
    streams: [streams[0].id, streams[1].id],
    offset: 0,
    limit: 6
  }

  const { body: page1, headers } = await request(app).get(`/${classifierJobs[0].id}/best-detections`).query(query) // should be stream1 only
  const { body: page2 } = await request(app).get(`/${classifierJobs[0].id}/best-detections`).query({
    ...query,
    offset: 6,
    limit: 6
  }) // should be stream 2 only

  expect(headers['total-items']).toEqual('72') // 2 streams, 6 per day, 6 days,
  expect(page1).toHaveLength(6)
  expect(page1.every(d => d.stream_id === streams[0].id)).toBeTruthy()

  expect(page2).toHaveLength(6)
  expect(page2.every(d => d.stream_id === streams[1].id)).toBeTruthy()
})

test('should respect pagination parameters for per stream request', async () => {
  const query = {
    by_date: false,
    n_per_chunk: 3,
    offset: 0,
    limit: 3
  }

  const { body: page1 } = await request(app).get(`/${classifierJobs[0].id}/best-detections`).query(query) // should be stream1 only
  const { body: page2 } = await request(app).get(`/${classifierJobs[0].id}/best-detections`).query({
    ...query,
    offset: 3,
    limit: 3
  }) // should be stream 2 only

  expect(page1).toHaveLength(3)
  expect(page1.every(d => d.stream_id === streams[0].id)).toBeTruthy()

  expect(page2).toHaveLength(3)
  expect(page2.every(d => d.stream_id === streams[1].id)).toBeTruthy()
})

test('should only find detections in requested job', async () => {
  const query = {
    by_date: false,
    n_per_chunk: 10 // max
  }

  const response = await request(app).get(`/${classifierJobs[1].id}/best-detections`).query(query)
  const items = response.body

  expect(items).toHaveLength(2) // only has 2
  expect(items[0].id).toBe(job2Stream1Day1BestDetection.id)
  expect(items[1].id).toBe(job2Stream1Day2BestDetection.id)
})

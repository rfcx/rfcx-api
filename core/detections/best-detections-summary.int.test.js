const request = require('supertest')
const { expressApp, seedValues, truncateNonBase, muteConsole } = require('../../common/testing/sequelize')
const router = require('./best-detections-summary')
const models = require('../_models')
const { updateBestDetections } = require('./bl')
const { REVIEW_STATUS_MAPPING } = require('./dao/review')

const app = expressApp()

app.use('/', router)

const project = {
  id: 'cqzyjmb58ddo',
  name: 'the best detections',
  createdById: seedValues.primaryUserId
}

const streams = [
  {
    id: 'ksdmfiori94a',
    name: 'the best det 1',
    createdById: seedValues.primaryUserId,
    projectId: project.id
  },
  {
    id: 's4i938bmd314',
    name: 'the best det 2',
    createdById: seedValues.primaryUserId,
    projectId: project.id
  },
  {
    id: 'ikr3404if13k',
    name: 'the best det 3',
    createdById: seedValues.primaryUserId,
    projectId: project.id
  }
]

const classifications = [
  {
    id: 929,
    value: 'cow',
    title: 'Cow',
    typeId: 1,
    sourceId: null
  },
  {
    id: 1934,
    value: 'chihuahua',
    title: 'Chihuahua',
    typeId: 1,
    sourceId: 1
  }
]

const classifiers = [
  {
    id: 4,
    externalId: 'l1l3kmv9i4i',
    name: 'model number one',
    version: 1,
    created_by_id: seedValues.otherUserId,
    modelRunner: 'tf2',
    modelUrl: 's3://somewhere0'
  },
  {
    id: 8,
    externalId: '1218kdmfidsl',
    name: 'model number two',
    version: 1,
    created_by_id: seedValues.otherUserId,
    modelRunner: 'tf2',
    modelUrl: 's3://somewhereovertherainbow1218'
  }
]

let classifierJobs = [
  {
    created_at: '2022-04-01 04:10',
    classifierId: classifiers[0].id,
    projectId: project.id,
    createdById: seedValues.primaryUserId,
    queryStart: '2024-01-01',
    queryEnd: '2024-05-01'
  },
  {
    created_at: '2022-04-01 05:10',
    classifierId: classifiers[1].id,
    projectId: project.id,
    createdById: seedValues.primaryUserId,
    queryStart: '2024-01-01',
    queryEnd: '2024-05-31'
  }
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
    classifications.forEach((classification) => {
      // we want 6 days of detections, 20 detections each day
      for (let day = 1; day < 7; day++) {
        let date = new Date('2024-01-01T08:00:00.000Z').setUTCDate(day).valueOf()

        for (let i = 0; i < 10; i++) {
          arbitraryDetections.push(oneDetection({
            streamId: stream.id,
            classificationId: classification.id,
            start: new Date(date),
            end: new Date(date + 5000),
            confidence: 0.7 + Math.random() / 10
          }))

          date += 60 * 60 * 1000
        }
      }
    })
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
  muteConsole('warn')
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

// INFO: Tests are copied from `best-detections.int.test.js`
describe('GET /classifier-jobs/:id/best-detections/summary', () => {
  test('should return right best per stream detections', async () => {
    const query = {
      n_per_chunk: 2
    }

    const response = await request(app).get(`/${classifierJobs[0].id}/best-detections/summary`).query(query)

    const json = response.body
    expect(response.statusCode).toBe(200)
    expect(json).toHaveProperty('unreviewed', 4) // 3 streams with 2 best per stream
    expect(json).toHaveProperty('rejected', 1)
    expect(json).toHaveProperty('uncertain', 1)
    expect(json).toHaveProperty('confirmed', 0)
  })

  test('should return right best per day detections', async () => {
    const query = {
      by_date: true,
      n_per_chunk: 2,
      start: '2024-01-01T00:00:00.000Z',
      end: '2024-01-04T00:00:00.000Z'
    }

    const response = await request(app).get(`/${classifierJobs[0].id}/best-detections/summary`).query(query)
    const json = response.body

    expect(response.statusCode).toBe(200)
    expect(json).toHaveProperty('unreviewed', 15) // 3 full days, 3 streams, 2 items per day per stream
    expect(json).toHaveProperty('rejected', 1)
    expect(json).toHaveProperty('uncertain', 1)
    expect(json).toHaveProperty('confirmed', 1)
  })

  test('should respect stream_ids in best per day', async () => {
    const query = {
      by_date: true,
      n_per_chunk: 1,
      start: '2024-01-01T00:00:00.000Z',
      end: '2024-01-04T00:00:00.000Z',
      streams: [streams[0].id, streams[1].id]
    }

    const response = await request(app).get(`/${classifierJobs[0].id}/best-detections/summary`).query(query)
    const json = response.body

    expect(json).toHaveProperty('unreviewed', 3) // 2 streams, 3 days, 1 result per day
    expect(json).toHaveProperty('rejected', 1)
    expect(json).toHaveProperty('uncertain', 1)
    expect(json).toHaveProperty('confirmed', 1)
  })

  test('should respect stream_ids in best per stream', async () => {
    const query = {
      by_date: false,
      n_per_chunk: 2,
      streams: [streams[0].id, streams[1].id]
    }

    const response = await request(app).get(`/${classifierJobs[0].id}/best-detections/summary`).query(query)
    const json = response.body

    expect(json).toHaveProperty('unreviewed', 2) // 2 streams, 2 results per day
    expect(json).toHaveProperty('rejected', 1)
    expect(json).toHaveProperty('uncertain', 1)
    expect(json).toHaveProperty('confirmed', 0)
  })

  test('should respect review statuses', async () => {
    const query = {
      by_date: false,
      n_per_chunk: 10, // max
      review_statuses: ['uncertain', 'confirmed']
    }

    const response = await request(app).get(`/${classifierJobs[0].id}/best-detections/summary`).query(query)
    const json = response.body

    // only has 2
    expect(json).toHaveProperty('unreviewed', 0)
    expect(json).toHaveProperty('rejected', 0)
    // from stream 1 day 3
    expect(json).toHaveProperty('uncertain', 1)
    // from stream 1 day 1
    expect(json).toHaveProperty('confirmed', 1)
  })

  test('should only find detections in requested job', async () => {
    const query = {
      by_date: false,
      n_per_chunk: 10 // max
    }

    const response = await request(app).get(`/${classifierJobs[1].id}/best-detections/summary`).query(query)
    const json = response.body

    expect(json).toHaveProperty('unreviewed', 2)
    expect(json).toHaveProperty('rejected', 0)
    expect(json).toHaveProperty('uncertain', 0)
    expect(json).toHaveProperty('confirmed', 0)
  })

  test('when dates are passed in best per stream, a 400 error is returned', async () => {
    const query = {
      by_date: false,
      start: '2024-01-01T00:00:00.000Z',
      end: '2024-01-04T00:00:00.000Z'
    }

    const response = await request(app).get(`/${classifierJobs[1].id}/best-detections/summary`).query(query)
    expect(response.statusCode).toEqual(400)
    expect(response.body.message).toEqual('Searching for the best detections of job does not support date range')
  })
})

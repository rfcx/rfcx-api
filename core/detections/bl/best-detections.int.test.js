const { seedValues, truncateNonBase } = require('../../../common/testing/sequelize')
const models = require('../../_models')
const { updateBestDetections } = require('.')

const project = { id: 'moo', name: 'my project', createdById: seedValues.primaryUserId }
const streams = [
  { id: 'aaa', name: 'fist stream', createdById: seedValues.primaryUserId, projectId: project.id },
  { id: 'bbb', name: 'second stream', createdById: seedValues.primaryUserId, projectId: project.id },
  { id: 'ccc', name: 'second stream', createdById: seedValues.primaryUserId, projectId: project.id }
]
const classifications = [
  { id: 7, value: 'woodpecker', title: 'Woodpecker', typeId: 1, sourceId: null },
  { id: 8, value: 'frog', title: 'Frog', typeId: 1, sourceId: 1 },
  { id: 9, value: 'hedgehog', title: 'Hedgehog', typeId: 1, sourceId: null },
  { id: 10, value: 'rabbit', title: 'Rabbit', typeId: 1, sourceId: null }
]
const classifiers = [
  { id: 4, externalId: 'q1q2q3q4', name: 'first model', version: 1, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: 's3://something1' },
  { id: 5, externalId: 'f1f3f3g4', name: 'second model', version: 1, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: 's3://something1' }
]
let classifierJobs = [
  { created_at: '2022-04-01 04:10', classifierId: classifiers[0].id, projectId: project.id, createdById: seedValues.primaryUserId, queryStart: '2024-01-01', queryEnd: '2024-05-01' },
  { created_at: '2022-04-01 05:10', classifierId: classifiers[1].id, projectId: project.id, createdById: seedValues.primaryUserId, queryStart: '2024-01-01', queryEnd: '2024-05-01' }
]

afterEach(async () => {
  await models.BestDetection.destroy({ where: {} })
  await models.Detection.destroy({ where: {} })
})

afterAll(async () => {
  await truncateNonBase()
})

beforeAll(async () => {
  await models.Project.create(project)
  await models.Stream.bulkCreate(streams)
  await models.Classification.bulkCreate(classifications)
  await models.Classifier.bulkCreate(classifiers)
  classifierJobs = await models.ClassifierJob.bulkCreate(classifierJobs)
})

function detectionFactory (partialDetection) {
  return {
    streamId: streams[0].id,
    classifierId: classifiers[0].id,
    end: new Date('2024-04-10T09:00:05.000Z').toISOString(),
    classificationId: classifications[0].id,
    classifierJobId: classifierJobs[0].id,
    confidence: 0.9,
    ...partialDetection
  }
}

test('should rank daily jobs of 1 stream in right order', async () => {
  const detections = [
    // day 1
    detectionFactory({
      start: new Date('2024-01-01T09:00:00.000Z'),
      confidence: 0.82
    }),
    detectionFactory({
      start: new Date('2024-01-01T11:00:00.000Z'),
      confidence: 0.95
    }),
    detectionFactory({
      start: new Date('2024-01-01T12:00:00.000Z'),
      confidence: 0.87
    }),
    // day2
    detectionFactory({
      start: new Date('2024-01-02T12:00:00.000Z'),
      confidence: 0.93
    }),
    detectionFactory({
      start: new Date('2024-01-02T12:00:00.000Z'),
      confidence: 0.88
    })
  ]

  await models.Detection.bulkCreate(detections)
  await updateBestDetections(classifierJobs[0])

  const found = await models.BestDetection.findAll({
    where: { classifierJobId: classifierJobs[0].id },
    order: ['start']
  })

  expect(found[0].dailyRanking).toBe(3)
  expect(found[1].dailyRanking).toBe(1)
  expect(found[2].dailyRanking).toBe(2)
  expect(found[3].dailyRanking).toBe(1)
  expect(found[4].dailyRanking).toBe(2)

  expect(found[0].streamRanking).toBe(5)
  expect(found[1].streamRanking).toBe(1)
  expect(found[2].streamRanking).toBe(4)
  expect(found[3].streamRanking).toBe(2)
  expect(found[4].streamRanking).toBe(3)
})

test('should rank detections from only one job', async () => {
  const detections = [
    // job1 1
    detectionFactory({
      start: new Date('2024-01-01T09:00:00.000Z'),
      confidence: 0.82
    }),
    detectionFactory({
      start: new Date('2024-01-01T11:00:00.000Z'),
      confidence: 0.95
    }),
    detectionFactory({
      start: new Date('2024-01-01T12:00:00.000Z'),
      confidence: 0.87
    }),
    // job 2
    detectionFactory({
      start: new Date('2024-01-01T13:00:00.000Z'),
      classifierJobId: classifierJobs[1].id,
      confidence: 0.82
    }),
    detectionFactory({
      start: new Date('2024-01-01T14:00:00.000Z'),
      classifierJobId: classifierJobs[1].id,
      confidence: 0.95
    })
  ]

  await models.Detection.bulkCreate(detections)
  await updateBestDetections(classifierJobs[0])

  const found = await models.BestDetection.findAll({
    where: { classifierJobId: classifierJobs[0].id },
    order: ['start']
  })

  expect(found).toHaveLength(3)

  expect(found[0].streamRanking).toBe(3)
  expect(found[1].streamRanking).toBe(1)
  expect(found[2].streamRanking).toBe(2)
})

test('should rank daily detections of different streams independently', async () => {
  const detections = [
    // stream 1
    detectionFactory({
      start: new Date('2024-01-01T09:00:00.000Z'),
      confidence: 0.82
    }),
    detectionFactory({
      start: new Date('2024-01-01T11:00:00.000Z'),
      confidence: 0.95
    }),
    // stream 2
    detectionFactory({
      start: new Date('2024-01-01T09:01:00.000Z'),
      streamId: streams[1].id,
      confidence: 0.83
    }),
    detectionFactory({
      start: new Date('2024-01-01T10:01:00.000Z'),
      streamId: streams[1].id,
      confidence: 0.94
    }),
    // stream 3
    detectionFactory({
      start: new Date('2024-01-01T09:05:00.000Z'),
      streamId: streams[2].id,
      confidence: 0.96
    }),
    detectionFactory({
      start: new Date('2024-01-01T11:05:00.000Z'),
      streamId: streams[2].id,
      confidence: 0.77
    })
  ]

  await models.Detection.bulkCreate(detections)
  await updateBestDetections(classifierJobs[0])

  const found = await models.BestDetection.findAll({
    where: { classifierJobId: classifierJobs[0].id },
    order: ['stream_id', 'start']
  })

  expect(found).toHaveLength(6)

  expect(found[0].streamId).toBe(streams[0].id)
  expect(found[0].dailyRanking).toBe(2)

  expect(found[1].streamId).toBe(streams[0].id)
  expect(found[1].dailyRanking).toBe(1)

  expect(found[2].streamId).toBe(streams[1].id)
  expect(found[2].dailyRanking).toBe(2)

  expect(found[3].streamId).toBe(streams[1].id)
  expect(found[3].dailyRanking).toBe(1)

  expect(found[4].streamId).toBe(streams[2].id)
  expect(found[4].dailyRanking).toBe(1)

  expect(found[5].streamId).toBe(streams[2].id)
  expect(found[5].dailyRanking).toBe(2)
})

test('should rank stream detections of different streams independently', async () => {
  const detections = [
    // stream 1
    detectionFactory({
      start: new Date('2024-01-01T09:00:00.000Z'),
      confidence: 0.93
    }),
    detectionFactory({
      start: new Date('2024-01-02T11:00:00.000Z'),
      confidence: 0.88
    }),
    detectionFactory({
      start: new Date('2024-01-02T12:00:00.000Z'),
      confidence: 0.95
    }),
    // stream 2
    detectionFactory({
      start: new Date('2024-01-01T09:01:00.000Z'),
      streamId: streams[1].id,
      confidence: 0.97
    }),
    detectionFactory({
      start: new Date('2024-01-01T11:01:00.000Z'),
      streamId: streams[1].id,
      confidence: 0.83
    }),
    detectionFactory({
      start: new Date('2024-01-01T12:01:00.000Z'),
      streamId: streams[1].id,
      confidence: 0.94
    })
  ]

  await models.Detection.bulkCreate(detections)
  await updateBestDetections(classifierJobs[0])

  const found = await models.BestDetection.findAll({
    where: { classifierJobId: classifierJobs[0].id },
    order: ['stream_id', 'start']
  })

  expect(found).toHaveLength(6)

  expect(found[0].streamId).toBe(streams[0].id)
  expect(found[0].streamRanking).toBe(2)

  expect(found[1].streamId).toBe(streams[0].id)
  expect(found[1].streamRanking).toBe(3)

  expect(found[2].streamId).toBe(streams[0].id)
  expect(found[2].streamRanking).toBe(1)

  expect(found[3].streamId).toBe(streams[1].id)
  expect(found[3].streamRanking).toBe(1)

  expect(found[4].streamId).toBe(streams[1].id)
  expect(found[4].streamRanking).toBe(3)

  expect(found[5].streamId).toBe(streams[1].id)
  expect(found[5].streamRanking).toBe(2)
})

const moment = require('moment')
const { saveMeta: { Detections } } = require('./mqtt-save-meta')
const models = require('../../modelsTimescale')
const { migrate, truncate, seed, seedValues } = require('../sequelize/testing')

beforeAll(async () => {
  await migrate(models.sequelize, models.Sequelize)
  await seed(models)
})
beforeEach(async () => {
  await truncate(models)
})

async function commonSetup () {
  const stream = { id: 'abc', name: 'my stream', createdById: seedValues.primaryUserId }
  await models.Stream.create(stream)
  const classification = { id: 6, value: 'chainsaw', title: 'Chainsaw', type_id: 1, source_id: 1 }
  await models.Classification.create(classification)
  const classifier = { id: 3, externalId: 'cccddd', name: 'chainsaw', version: 5, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: 's3://something' }
  await models.Classifier.create(classifier)
  const classifierOutput = { classifierId: classifier.id, classificationId: classification.id, outputClassName: 'ch', ignoreThreshold: 0.1 }
  await models.ClassifierOutput.create(classifierOutput)
  return { stream, classification, classifier, classifierOutput }
}

describe('MQTT save meta', () => {
  test('detections', async () => {
    const { stream, classifier, classifierOutput } = await commonSetup()
    const start = 1420070745567
    const step = 1000
    const confidencesRaw = ',,,0.98,,,,,,,,,,,,0.98,,,,0.95,,,,,,,,,,,0.90,,,,,0.97,,,,,,,,,,0.96,,,,,,'
    const input = `${classifierOutput.outputClassName}*${classifier.name}-v${classifier.version}*${start}*${step}*${confidencesRaw}`

    await Detections(input, stream.id)

    const detections = await models.Detection.findAll({ order: ['start'] })
    expect(detections.length).toBe(6)
    expect(detections[0].start).toEqual(moment(start + 3 * step).toDate())
    expect(detections[0].confidence).toBe(0.98)
    expect(detections[1].start).toEqual(moment(start + 15 * step).toDate())
    expect(detections[1].confidence).toBe(0.98)
    expect(detections[2].start).toEqual(moment(start + 19 * step).toDate())
    expect(detections[2].confidence).toBe(0.95)
    expect(detections[3].start).toEqual(moment(start + 30 * step).toDate())
    expect(detections[3].confidence).toBe(0.90)
  })
})

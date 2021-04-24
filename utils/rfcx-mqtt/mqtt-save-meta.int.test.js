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
  const stream = { id: 'abc', name: 'my stream', created_by_id: seedValues.primaryUserId }
  await models.Stream.create(stream)
  const classification = { id: 6, value: 'chainsaw', title: 'Chainsaw', type_id: 1, source_id: 1 }
  await models.Classification.create(classification)
  const classifier = { id: 3, external_id: 'cccddd', name: 'chainsaw', version: 5, created_by_id: seedValues.otherUserId, model_runner: 'tf2', model_url: 's3://something' }
  await models.Classifier.create(classifier)
  const classifierOutput = { classifier_id: classifier.id, classification_id: classification.id, output_class_name: 'ch', ignore_threshold: 0.1 }
  await models.ClassifierOutput.create(classifierOutput)
  return { stream, classification, classifier, classifierOutput }
}

describe('MQTT save meta', () => {
  test('detections single payload', async () => {
    const { stream, classifier, classifierOutput } = await commonSetup()
    const start = 1420070745567
    const step = 1000
    const confidencesRaw = ',,,0.98,,,,,,,,,,,,0.98,,,,0.95,,,,,,,,,,,0.90,,,,,0.97,,,,,,,,,,0.96,,,,,,'
    const input = `${classifierOutput.output_class_name}*${classifier.name}-v${classifier.version}*${start}*${step}*${confidencesRaw}`

    await Detections([input], stream.id)

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

  test('detections multiple payloads', async () => {
    const { stream, classifier, classifierOutput } = await commonSetup()
    const start1 = 1619211870411
    const start2 = 1619212320741
    const step = 975
    const confidencesRaw1 = ',,,,,,,,,0.99,,,,,0.96,,,,0.99,0.98,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,0.99,0.98,,,0.97,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,'
    const confidencesRaw2 = ',,,,,,,,,0.98,,0.98,,,,,0.99,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,0.99,,,,,,,,0.98,,,,,,,,,,,,,,,,,,,,,,0.95,,,,'
    const input1 = `${classifierOutput.outputClassName}*${classifier.name}-v${classifier.version}*${start1}*${step}*${confidencesRaw1}`
    const input2 = `${classifierOutput.outputClassName}*${classifier.name}-v${classifier.version}*${start2}*${step}*${confidencesRaw2}`
    console.log = jest.fn()

    await Detections([input1, input2], stream.id)

    const detections = await models.Detection.findAll({ order: ['start'] })
    expect(detections.length).toBe(13)
    expect(detections[0].start).toEqual(moment(start1 + 9 * step).toDate())
    expect(detections[0].confidence).toBe(0.99)
    expect(detections[7].start).toEqual(moment(start2 + 9 * step).toDate())
    expect(detections[7].confidence).toBe(0.98)
    expect(detections[8].start).toEqual(moment(start2 + 11 * step).toDate())
    expect(detections[8].confidence).toBe(0.98)
    expect(detections[12].start).toEqual(moment(start2 + 89 * step).toDate())
    expect(detections[12].confidence).toBe(0.95)
  })

  test('payload with bad step (*1000)', async () => {
    const { stream, classifier, classifierOutput } = await commonSetup()
    const start = 1420070745567
    const step = 1000
    const confidencesRaw = ',,,0.98,,,,,,,,,,,,0.98,,,,0.95,,,,,,,,,,,0.90,,,,,0.97,,,,,,,,,,0.96,,,,,,'
    const input = `${classifierOutput.outputClassName}*${classifier.name}-v${classifier.version}*${start}*${step * 1000}*${confidencesRaw}`
    console.log = jest.fn()

    await Detections([input], stream.id)

    const detections = await models.Detection.findAll({ order: ['start'] })
    expect(detections.length).toBe(6)
    expect(detections[0].start).toEqual(moment(start + 3 * step).toDate())
  })
})

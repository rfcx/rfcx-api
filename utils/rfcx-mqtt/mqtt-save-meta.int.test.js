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
  const classifierOutput = { classifier_id: classifier.id, classification_id: classification.id, output_class_name: 'chnsw', ignore_threshold: 0.1 }
  await models.ClassifierOutput.create(classifierOutput)
  return { stream, classification, classifier, classifierOutput }
}

describe('MQTT save meta', () => {
  test('detections', async () => {
    const { stream, classifier, classifierOutput } = await commonSetup()
    const input = `${classifierOutput.output_class_name}*${classifier.name}-${classifier.version}*1420070745567*1000*,,,0.98,,,,,,,,,,,,0.98,,,,0.95,,,,,,,,,,,0.90,,,,,0.97,,,,,,,,,,0.96,,,,,,`

    await Detections(input, stream.id)

    const detections = await models.Detection.findAll({ order: ['start'] })
    expect(detections.length).toBe(6)
    // expect(detections[0].start).toEqual(moment(requestBody.start).toDate())
    // expect(detections[0].confidence).toBe(requestBody.confidences[0])
    // expect(detections[1].start).toEqual(moment(requestBody.start).add(requestBody.step, 's').toDate())
    // expect(detections[1].confidence).toBe(requestBody.confidences[1])
  })
})

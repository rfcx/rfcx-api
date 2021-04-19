const request = require('supertest')
const moment = require('moment')
const routes = require('./detections')
const models = require('../../../modelsTimescale')
const { migrate, truncate, expressApp, seed, seedValues } = require('../../../utils/sequelize/testing')

const app = expressApp()

app.use('/', routes)

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
  const classifier = { id: 3, external_id: 'cccddd', name: 'chainsaw model', version: 1, created_by_id: seedValues.otherUserId, model_runner: 'tf2', model_url: 's3://something' }
  await models.Classifier.create(classifier)
  const classifierOutput = { classifier_id: classifier.id, classification_id: classification.id, output_class_name: 'chnsw', ignore_threshold: 0.1 }
  await models.ClassifierOutput.create(classifierOutput)
  return { stream, classification, classifier, classifierOutput }
}

describe('POST /internal/prediction/detections', () => {
  test('success', async () => {
    const { stream, classifier, classifierOutput } = await commonSetup()
    const requestBody = {
      stream_id: stream.id,
      classifier_id: classifier.id.toString(),
      classification: classifierOutput.output_class_name,
      start: '2021-03-15T00:00:00Z',
      end: '2021-03-15T00:00:05Z',
      confidences: [0.99, 0.98, 0.97, 0.001, 0.00001, 0.47],
      step: 2.5
    }

    const response = await request(app).post('/detections').send(requestBody)

    expect(response.statusCode).toBe(201)
    const detections = await models.Detection.findAll({ order: ['start'] })
    expect(detections.length).toBe(requestBody.confidences.filter(c => c > classifierOutput.ignore_threshold).length)
    expect(detections[0].start).toEqual(moment(requestBody.start).toDate())
    expect(detections[0].confidence).toBe(requestBody.confidences[0])
    expect(detections[1].start).toEqual(moment(requestBody.start).add(requestBody.step, 's').toDate())
    expect(detections[1].confidence).toBe(requestBody.confidences[1])
    expect(detections[2].start).toEqual(moment(requestBody.start).add(2 * requestBody.step, 's').toDate())
    expect(detections[2].confidence).toBe(requestBody.confidences[2])
    expect(detections[3].start).toEqual(moment(requestBody.start).add(5 * requestBody.step, 's').toDate())
    expect(detections[3].confidence).toBe(requestBody.confidences[5])
  })
})
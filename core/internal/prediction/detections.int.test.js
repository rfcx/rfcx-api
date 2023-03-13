const request = require('supertest')
const moment = require('moment')
const routes = require('./detections')
const models = require('../../_models')
const { expressApp, seedValues, truncateNonBase } = require('../../../common/testing/sequelize')

const app = expressApp()

app.use('/', routes)

afterEach(async () => {
  await truncateNonBase(models)
})

afterAll(async () => {
  await models.sequelize.close()
})

async function commonSetup () {
  const stream = { id: 'abced', name: 'my stream', createdById: seedValues.primaryUserId }
  await models.Stream.create(stream)
  const classification = await models.Classification.create({ value: 'chainsaw', title: 'Chainsaw', typeId: 1, sourceId: 1 })
  const classifier = await models.Classifier.create({ externalId: 'cccddd', name: 'chainsaw model', version: 1, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: 's3://something' })
  const classifierOutput = { classifierId: classifier.id, classificationId: classification.id, outputClassName: 'chnsw', ignoreThreshold: 0.1 }
  await models.ClassifierOutput.create(classifierOutput)
  return { stream, classification, classifier, classifierOutput }
}

describe('POST /internal/prediction/detections', () => {
  test('success', async () => {
    const { stream, classifier, classifierOutput } = await commonSetup()
    const requestBody = {
      stream_id: stream.id,
      classifier_id: classifier.id.toString(),
      classification: classifierOutput.outputClassName,
      start: '2021-03-15T00:00:00Z',
      end: '2021-03-15T00:00:05Z',
      confidences: [0.99, 0.98, 0.97, 0.001, 0.00001, 0.47],
      step: 2.5
    }

    const response = await request(app).post('/detections').send(requestBody)

    expect(response.statusCode).toBe(201)
    const detections = await models.Detection.findAll({ order: ['start'] })
    expect(detections.length).toBe(requestBody.confidences.filter(c => c > classifierOutput.ignoreThreshold).length)
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

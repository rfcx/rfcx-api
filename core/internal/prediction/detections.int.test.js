const request = require('supertest')
const moment = require('moment')
const routes = require('./detections')
const models = require('../../_models')
const { expressApp, seedValues, truncateNonBase, muteConsole } = require('../../../common/testing/sequelize')

const app = expressApp()

app.use('/', routes)

beforeAll(() => {
  muteConsole('warn')
})

afterEach(async () => {
  await truncateNonBase(models)
})

afterAll(async () => {
  await models.sequelize.close()
})

async function commonSetup () {
  const stream = { id: 'abced', name: 'my stream', createdById: seedValues.primaryUserId }
  await models.Stream.findOrCreate({ where: stream })
  await models.UserStreamRole.create({ stream_id: stream.id, user_id: stream.createdById, role_id: seedValues.roleOwner })
  const classification = (await models.Classification.findOrCreate({ where: { value: 'chainsaw', title: 'Chainsaw', typeId: 1, sourceId: 1 } }))[0]
  const classifier = (await models.Classifier.findOrCreate({ where: { externalId: 'cccddd', name: 'chainsaw model', version: 1, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: 's3://something' } }))[0]
  const classifierOutput = { classifierId: classifier.id, classificationId: classification.id, outputClassName: 'chnsw', ignoreThreshold: 0.1 }
  await models.ClassifierOutput.findOrCreate({ where: classifierOutput })
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
  test('403 when creating for non accessible stream', async () => {
    const { classifier, classifierOutput } = await commonSetup()
    const project2 = (await models.Project.findOrCreate({ where: { id: 'project22', name: 'not my project', createdById: seedValues.otherUserId } }))[0]
    const stream2 = (await models.Stream.findOrCreate({ where: { id: 'abcedre', name: 'not my stream', createdById: seedValues.otherUserId, project_id: project2.id } }))[0]

    const requestBody = {
      stream_id: stream2.id,
      classifier_id: classifier.id.toString(),
      classification: classifierOutput.outputClassName,
      start: '2021-03-15T00:00:00Z',
      end: '2021-03-15T00:00:05Z',
      confidences: [0.99, 0.98, 0.97, 0.001, 0.00001, 0.47],
      step: 2.5
    }

    const response = await request(app).post('/detections').send(requestBody)

    expect(response.statusCode).toBe(403)
    const detections = await models.Detection.findAll({ order: ['start'] })
    expect(detections.length).toBe(0)
  })
})

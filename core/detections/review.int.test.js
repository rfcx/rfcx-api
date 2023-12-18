const request = require('supertest')
const routes = require('./review')
const models = require('../_models')
const { expressApp, seedValues, truncateNonBase, muteConsole } = require('../../common/testing/sequelize')
const { DetectionReview } = require('../_models')
const { DONE } = require('../classifier-jobs/classifier-job-status')

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
  const project = await models.Project.create({ id: 'ppp111', name: 'My Project 122', createdById: seedValues.primaryUserId })
  const stream = await models.Stream.create({ id: 'abc', name: 'my stream', createdById: seedValues.primaryUserId, projectId: project.id })
  await models.UserProjectRole.create({ project_id: project.id, user_id: seedValues.primaryUserId, role_id: seedValues.roleOwner })
  await models.UserStreamRole.create({ stream_id: stream.id, user_id: seedValues.primaryUserId, role_id: seedValues.roleOwner })
  const classification = await models.Classification.create({ value: 'chainsaw', title: 'Chainsaw', typeId: 1, source_id: 1 })
  const classification2 = await models.Classification.create({ value: 'gunshot', title: 'Gunshot', typeId: 1, source_id: 1 })
  const classification3 = await models.Classification.create({ value: 'vehicle', title: 'Vehicle', typeId: 1, source_id: 1 })
  const classifier = await models.Classifier.create({ externalId: 'cccddd', name: 'chainsaw model', version: 1, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: 's3://something' })
  const classifierOutput = await models.ClassifierOutput.create({ classifierId: classifier.id, classificationId: classification.id, outputClassName: 'chnsw', ignoreThreshold: 0.1 })
  const classifierOutput2 = await models.ClassifierOutput.create({ classifierId: classifier.id, classificationId: classification2.id, outputClassName: 'gunsh', ignoreThreshold: 0.1 })
  const classifierOutput3 = await models.ClassifierOutput.create({ classifierId: classifier.id, classificationId: classification3.id, outputClassName: 'veh', ignoreThreshold: 0.1 })
  const job = await models.ClassifierJob.create({ classifierId: classifier.id, projectId: project.id, status: DONE, queryStreams: stream.name, queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', minutesTotal: 2, minutesCompleted: 0, createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-09-07T08:07:49.158Z', startedAt: null, completedAt: null })
  const job2 = await models.ClassifierJob.create({ classifierId: classifier.id, projectId: project.id, status: DONE, queryStreams: stream.name, queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', minutesTotal: 2, minutesCompleted: 0, createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-09-07T08:07:49.158Z', startedAt: null, completedAt: null })
  return { project, stream, classification, classification2, classification3, classifier, classifierOutput, classifierOutput2, classifierOutput3, job, job2 }
}

describe('POST /:streamId/detections/:start/review', () => {
  describe('failed cases', () => {
    test('stream not found', async () => {
      const { classification, classifier } = await commonSetup()
      const body = {
        status: 'confirmed',
        classification: classification.value,
        classifier: classifier.id
      }
      const response = await request(app).post('/str/detections/2022-01-01T00:00:00.000Z/review').send(body)

      expect(response.statusCode).toBe(404)
      expect(response.body.message).toBe('stream with given id doesn\'t exist.')
    })
    test('detection not found by time', async () => {
      const { stream, classification, classifier } = await commonSetup()
      await models.Detection.create({
        streamId: stream.id,
        classificationId: classification.id,
        classifierId: classifier.id,
        start: '2022-01-01T00:00:00.000Z',
        end: '2022-01-01T00:00:01.000Z',
        confidence: 0.99
      })
      const body = {
        status: 'confirmed',
        classification: classification.value,
        classifier: classifier.id
      }
      const response = await request(app).post(`/${stream.id}/detections/2022-02-01T00:00:00.000Z/review`).send(body)

      expect(response.statusCode).toBe(404)
      expect(response.body.message).toBe('Detection with given parameters not found')
    })
    test('detection not found by classification', async () => {
      const { stream, classification, classifier } = await commonSetup()
      const start = '2022-01-01T00:00:00.000Z'
      await models.Detection.create({
        streamId: stream.id,
        classificationId: classification.id,
        classifierId: classifier.id,
        start: start,
        end: '2022-01-01T00:00:01.000Z',
        confidence: 0.99
      })
      const classification2 = (await models.Classification.findOrCreate({ where: { value: 'vehicle', title: 'Vehicle', typeId: 1, source_id: 1 } }))[0]
      const body = {
        status: 'confirmed',
        classification: classification2.value,
        classifier: classifier.id
      }
      const response = await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

      expect(response.statusCode).toBe(404)
      expect(response.body.message).toBe('Detection with given parameters not found')
    })
    test('detection not found by classifier', async () => {
      const { stream, classification, classifier } = await commonSetup()
      const start = '2022-01-01T00:00:00.000Z'
      await models.Detection.create({
        streamId: stream.id,
        classificationId: classification.id,
        classifierId: classifier.id,
        start: start,
        end: '2022-01-01T00:00:01.000Z',
        confidence: 0.99
      })
      const classifier2 = await models.Classifier.create({ externalId: 'eeeggg', name: 'chainsaw model 2', version: 1, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: 's3://something' })
      const body = {
        status: 'confirmed',
        classification: classification.value,
        classifier: classifier2.id
      }
      const response = await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

      expect(response.statusCode).toBe(404)
      expect(response.body.message).toBe('Detection with given parameters not found')
    })
    test('no access to stream', async () => {
      const { classification, classifier } = await commonSetup()
      const stream2 = await models.Stream.create({ id: 'def', name: 'my stream 2', createdById: seedValues.otherUserId })
      const start = '2022-01-01T00:00:00.000Z'
      await models.Detection.create({
        streamId: stream2.id,
        classificationId: classification.id,
        classifierId: classifier.id,
        start: start,
        end: '2022-01-01T00:00:01.000Z',
        confidence: 0.99
      })
      const body = {
        status: 'confirmed',
        classification: classification.value,
        classifier: classifier.id
      }
      const response = await request(app).post(`/${stream2.id}/detections/${start}/review`).send(body)

      expect(response.statusCode).toBe(403)
      expect(response.body.message).toBe('You do not have permission to review detections in this stream.')
    })

    test('status is required', async () => {
      const { stream, classification, classifier } = await commonSetup()
      const start = '2022-01-01T00:00:00.000Z'
      await models.Detection.create({
        streamId: stream.id,
        classificationId: classification.id,
        classifierId: classifier.id,
        start: start,
        end: '2022-01-01T00:00:01.000Z',
        confidence: 0.99
      })

      const body = {
        classification: classification.value,
        classifier: classifier.id
      }
      const response = await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

      expect(response.statusCode).toBe(400)
      expect(response.body.message).toBe('Validation errors: Parameter \'status\' the parameter is required but was not provided.')
    })
  })
  describe('success cases', () => {
    test('review defaults to null', async () => {
      const { stream, classification, classifier } = await commonSetup()
      const start = '2022-01-01T00:00:00.000Z'
      const detection = await models.Detection.create({
        streamId: stream.id,
        classificationId: classification.id,
        classifierId: classifier.id,
        start: start,
        end: '2022-01-01T00:00:01.000Z',
        confidence: 0.99
      })
      expect(detection.reviewStatus).toBeNull()
    })

    test('create positive review', async () => {
      const { stream, classification, classifier } = await commonSetup()
      const start = '2022-01-01T00:00:00.000Z'
      const detection = await models.Detection.create({
        streamId: stream.id,
        classificationId: classification.id,
        classifierId: classifier.id,
        start: start,
        end: '2022-01-01T00:00:01.000Z',
        confidence: 0.45
      })

      const body = {
        status: 'confirmed',
        classification: classification.value,
        classifier: classifier.id
      }
      const response = await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

      expect(response.statusCode).toBe(200)
      const review = await models.DetectionReview.findOne({ where: { detectionId: detection.toJSON().id } })
      expect(review.status).toBe(1)
      expect(review.userId).toBe(seedValues.primaryUserId)
      const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
      expect(detectionUpdated.reviewStatus).toBe(1)
    })
    test('create negative review', async () => {
      const { stream, classification, classifier } = await commonSetup()
      const start = '2022-01-01T00:00:00.000Z'
      const detection = await models.Detection.create({
        streamId: stream.id,
        classificationId: classification.id,
        classifierId: classifier.id,
        start: start,
        end: '2022-01-01T00:00:01.000Z',
        confidence: 0.99
      })
      const body = {
        status: 'rejected',
        classification: classification.value,
        classifier: classifier.id
      }
      const response = await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

      expect(response.statusCode).toBe(200)
      const review = await models.DetectionReview.findOne({ where: { detectionId: detection.toJSON().id } })
      expect(review.status).toBe(-1)
      expect(review.userId).toBe(seedValues.primaryUserId)
      const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
      expect(detectionUpdated.reviewStatus).toBe(-1)
    })
    test('create uncertain review', async () => {
      const { stream, classification, classifier } = await commonSetup()
      const start = '2022-01-01T00:00:00.000Z'
      const detection = await models.Detection.create({
        streamId: stream.id,
        classificationId: classification.id,
        classifierId: classifier.id,
        start: start,
        end: '2022-01-01T00:00:01.000Z',
        confidence: 0.99
      })

      const body = {
        status: 'uncertain',
        classification: classification.value,
        classifier: classifier.id
      }
      const response = await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

      expect(response.statusCode).toBe(200)
      const review = await models.DetectionReview.findOne({ where: { detectionId: detection.toJSON().id } })
      expect(review.status).toBe(0)
      expect(review.userId).toBe(seedValues.primaryUserId)
      const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
      expect(detectionUpdated.reviewStatus).toBe(0)
    })
    test('updates from negative to uncertain review', async () => {
      const { stream, classification, classifier } = await commonSetup()
      const start = '2022-01-01T00:00:00.000Z'
      const detection = await models.Detection.create({
        streamId: stream.id,
        classificationId: classification.id,
        classifierId: classifier.id,
        start: start,
        end: '2022-01-01T00:00:01.000Z',
        confidence: 0.99
      })
      const body1 = {
        status: 'rejected',
        classification: classification.value,
        classifier: classifier.id
      }
      const response1 = await request(app).post(`/${stream.id}/detections/${start}/review`).send(body1)
      expect(response1.statusCode).toBe(200)
      const review1 = await models.DetectionReview.findOne({ where: { detectionId: detection.toJSON().id } })
      expect(review1.status).toBe(-1)
      const detectionUpdated1 = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
      expect(detectionUpdated1.reviewStatus).toBe(-1)

      const body2 = {
        status: 'uncertain',
        classification: classification.value,
        classifier: classifier.id
      }
      const response2 = await request(app).post(`/${stream.id}/detections/${start}/review`).send(body2)
      expect(response2.statusCode).toBe(200)
      const review2 = await models.DetectionReview.findOne({ where: { detectionId: detection.toJSON().id } })
      expect(review1.id).toBe(review2.id)
      expect(review2.status).toBe(0)
      const detectionUpdated2 = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
      expect(detectionUpdated2.reviewStatus).toBe(0)
    })
    test('updates from negative to positive review', async () => {
      const { stream, classification, classifier } = await commonSetup()
      const start = '2022-01-01T00:00:00.000Z'
      const detection = await models.Detection.create({
        streamId: stream.id,
        classificationId: classification.id,
        classifierId: classifier.id,
        start: start,
        end: '2022-01-01T00:00:01.000Z',
        confidence: 0.99
      })

      const body1 = {
        status: 'rejected',
        classification: classification.value,
        classifier: classifier.id
      }
      const response1 = await request(app).post(`/${stream.id}/detections/${start}/review`).send(body1)
      expect(response1.statusCode).toBe(200)
      const review1 = await models.DetectionReview.findOne({ where: { detectionId: detection.toJSON().id } })
      expect(review1.status).toBe(-1)
      const detectionUpdated1 = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
      expect(detectionUpdated1.reviewStatus).toBe(-1)

      const body2 = {
        status: 'confirmed',
        classification: classification.value,
        classifier: classifier.id
      }
      const response2 = await request(app).post(`/${stream.id}/detections/${start}/review`).send(body2)
      expect(response2.statusCode).toBe(200)
      const review2 = await models.DetectionReview.findOne({ where: { detectionId: detection.toJSON().id } })
      expect(review1.id).toBe(review2.id)
      expect(review2.status).toBe(1)
      const detectionUpdated2 = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
      expect(detectionUpdated2.reviewStatus).toBe(1)
    })

    test('updates from uncertian to negative review', async () => {
      const { stream, classification, classifier } = await commonSetup()
      const start = '2022-01-01T00:00:00.000Z'
      const detection = await models.Detection.create({
        streamId: stream.id,
        classificationId: classification.id,
        classifierId: classifier.id,
        start: start,
        end: '2022-01-01T00:00:01.000Z',
        confidence: 0.99
      })

      const body1 = {
        status: 'uncertain',
        classification: classification.value,
        classifier: classifier.id
      }
      const response1 = await request(app).post(`/${stream.id}/detections/${start}/review`).send(body1)
      expect(response1.statusCode).toBe(200)
      const review1 = await models.DetectionReview.findOne({ where: { detectionId: detection.toJSON().id } })
      expect(review1.status).toBe(0)
      const detectionUpdated1 = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
      expect(detectionUpdated1.reviewStatus).toBe(0)

      const body2 = {
        status: 'rejected',
        classification: classification.value,
        classifier: classifier.id
      }
      const response2 = await request(app).post(`/${stream.id}/detections/${start}/review`).send(body2)
      expect(response2.statusCode).toBe(200)
      const review2 = await models.DetectionReview.findOne({ where: { detectionId: detection.toJSON().id } })
      expect(review1.id).toBe(review2.id)
      expect(review2.status).toBe(-1)
      const detectionUpdated2 = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
      expect(detectionUpdated2.reviewStatus).toBe(-1)
    })

    test('updates from uncertian to positive review', async () => {
      const { stream, classification, classifier } = await commonSetup()
      const start = '2022-01-01T00:00:00.000Z'
      const detection = await models.Detection.create({
        streamId: stream.id,
        classificationId: classification.id,
        classifierId: classifier.id,
        start: start,
        end: '2022-01-01T00:00:01.000Z',
        confidence: 0.99
      })

      const body1 = {
        status: 'uncertain',
        classification: classification.value,
        classifier: classifier.id
      }
      const response1 = await request(app).post(`/${stream.id}/detections/${start}/review`).send(body1)
      expect(response1.statusCode).toBe(200)
      const review1 = await models.DetectionReview.findOne({ where: { detectionId: detection.toJSON().id } })
      expect(review1.status).toBe(0)
      const detectionUpdated1 = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
      expect(detectionUpdated1.reviewStatus).toBe(0)

      const body2 = {
        status: 'confirmed',
        classification: classification.value,
        classifier: classifier.id
      }
      const response2 = await request(app).post(`/${stream.id}/detections/${start}/review`).send(body2)
      expect(response2.statusCode).toBe(200)
      const review2 = await models.DetectionReview.findOne({ where: { detectionId: detection.toJSON().id } })
      expect(review1.id).toBe(review2.id)
      expect(review2.status).toBe(1)
      const detectionUpdated2 = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
      expect(detectionUpdated2.reviewStatus).toBe(1)
    })

    test('updates from positive to negative review', async () => {
      const { stream, classification, classifier } = await commonSetup()
      const start = '2022-01-01T00:00:00.000Z'
      const detection = await models.Detection.create({
        streamId: stream.id,
        classificationId: classification.id,
        classifierId: classifier.id,
        start: start,
        end: '2022-01-01T00:00:01.000Z',
        confidence: 0.99
      })

      const body1 = {
        status: 'confirmed',
        classification: classification.value,
        classifier: classifier.id
      }
      const response1 = await request(app).post(`/${stream.id}/detections/${start}/review`).send(body1)
      expect(response1.statusCode).toBe(200)
      const review1 = await models.DetectionReview.findOne({ where: { detectionId: detection.toJSON().id } })
      expect(review1.status).toBe(1)
      const detectionUpdated1 = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
      expect(detectionUpdated1.reviewStatus).toBe(1)

      const body2 = {
        status: 'rejected',
        classification: classification.value,
        classifier: classifier.id
      }
      const response2 = await request(app).post(`/${stream.id}/detections/${start}/review`).send(body2)
      expect(response2.statusCode).toBe(200)
      const review2 = await models.DetectionReview.findOne({ where: { detectionId: detection.toJSON().id } })
      expect(review1.id).toBe(review2.id)
      expect(review2.status).toBe(-1)
      const detectionUpdated2 = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
      expect(detectionUpdated2.reviewStatus).toBe(-1)
    })

    test('updates from positive to uncertain review', async () => {
      const { stream, classification, classifier } = await commonSetup()
      const start = '2022-01-01T00:00:00.000Z'
      const detection = await models.Detection.create({
        streamId: stream.id,
        classificationId: classification.id,
        classifierId: classifier.id,
        start: start,
        end: '2022-01-01T00:00:01.000Z',
        confidence: 0.99
      })

      const body1 = {
        status: 'confirmed',
        classification: classification.value,
        classifier: classifier.id
      }
      const response1 = await request(app).post(`/${stream.id}/detections/${start}/review`).send(body1)
      expect(response1.statusCode).toBe(200)
      const review1 = await models.DetectionReview.findOne({ where: { detectionId: detection.toJSON().id } })
      expect(review1.status).toBe(1)
      const detectionUpdated1 = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
      expect(detectionUpdated1.reviewStatus).toBe(1)

      const body2 = {
        status: 'uncertain',
        classification: classification.value,
        classifier: classifier.id
      }
      const response2 = await request(app).post(`/${stream.id}/detections/${start}/review`).send(body2)
      expect(response2.statusCode).toBe(200)
      const review2 = await models.DetectionReview.findOne({ where: { detectionId: detection.toJSON().id } })
      expect(review1.id).toBe(review2.id)
      expect(review2.status).toBe(0)
      const detectionUpdated2 = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
      expect(detectionUpdated2.reviewStatus).toBe(0)
    })

    test('updates both duplicate detections', async () => {
      const { stream, classification, classifier } = await commonSetup()
      const data = {
        streamId: stream.id,
        classificationId: classification.id,
        classifierId: classifier.id,
        start: '2022-01-01T00:00:00.000Z',
        end: '2022-01-01T00:00:01.000Z',
        confidence: 0.99
      }
      const detection1 = await models.Detection.create(data)
      const detection2 = await models.Detection.create(data)

      const body = {
        status: 'confirmed',
        classification: classification.value,
        classifier: classifier.id
      }
      const response1 = await request(app).post(`/${stream.id}/detections/${data.start}/review`).send(body)
      expect(response1.statusCode).toBe(200)

      const review1 = await models.DetectionReview.findOne({ where: { detectionId: detection1.toJSON().id } })
      expect(review1.status).toBe(1)
      const detectionUpdated1 = await models.Detection.findOne({ where: { id: detection1.toJSON().id } })
      expect(detectionUpdated1.reviewStatus).toBe(1)
      const review2 = await models.DetectionReview.findOne({ where: { detectionId: detection2.toJSON().id } })
      expect(review2.status).toBe(1)
      const detectionUpdated2 = await models.Detection.findOne({ where: { id: detection2.toJSON().id } })
      expect(detectionUpdated2.reviewStatus).toBe(1)
    })

    describe('detection reviewStatus update with multiple reviews', () => {
      test('1 negative, 0 uncertain, 0 positive + 1 negative', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: -1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: -1
        })

        const body = {
          status: 'rejected',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated1 = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(-1)
        expect(detectionUpdated1.reviewStatus).toBe(-1)
      })
      test('1 negative, 0 uncertain, 0 positive + 1 uncertain', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: -1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: -1
        })

        const body = {
          status: 'uncertain',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(-1)
        expect(detectionUpdated.reviewStatus).toBe(0)
      })
      test('1 negative, 0 uncertain, 0 positive + 1 positive', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: -1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: -1
        })

        const body = {
          status: 'confirmed',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(-1)
        expect(detectionUpdated.reviewStatus).toBe(0)
      })
      test('0 negative, 1 uncertain, 0 positive + 1 uncertain', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: 0
        })

        const body = {
          status: 'uncertain',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(0)
        expect(detectionUpdated.reviewStatus).toBe(0)
      })
      test('0 negative, 1 uncertain, 0 positive + 1 negative', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: 0
        })

        const body = {
          status: 'rejected',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(0)
        expect(detectionUpdated.reviewStatus).toBe(0)
      })
      test('0 negative, 1 uncertain, 0 positive + 1 positive', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: 0
        })

        const body = {
          status: 'confirmed',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(0)
        expect(detectionUpdated.reviewStatus).toBe(0)
      })
      test('0 negative, 0 uncertain, 1 positive + 1 positive', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: 1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: 1
        })

        const body = {
          status: 'confirmed',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(1)
        expect(detectionUpdated.reviewStatus).toBe(1)
      })
      test('0 negative, 0 uncertain, 1 positive + 1 negative', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: 1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: 1
        })

        const body = {
          status: 'rejected',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(1)
        expect(detectionUpdated.reviewStatus).toBe(0)
      })
      test('0 negative, 0 uncertain, 1 positive + 1 uncertain', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: 1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: 1
        })

        const body = {
          status: 'uncertain',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(1)
        expect(detectionUpdated.reviewStatus).toBe(0)
      })

      test('1 negative, 1 uncertain, 0 positive + 1 positive', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: -1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.anotherUserId,
          status: 0
        })

        const body = {
          status: 'confirmed',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(0)
        expect(detectionUpdated.reviewStatus).toBe(0)
      })
      test('1 negative, 1 uncertain, 0 positive + 1 negative', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: -1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.anotherUserId,
          status: 0
        })

        const body = {
          status: 'rejected',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(0)
        expect(detectionUpdated.reviewStatus).toBe(-1)
      })
      test('1 negative, 1 uncertain, 0 positive + 1 uncertain', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: -1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.anotherUserId,
          status: 0
        })

        const body = {
          status: 'uncertain',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(0)
        expect(detectionUpdated.reviewStatus).toBe(0)
      })
      test('0 negative, 1 uncertain, 1 positive + 1 negative', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.anotherUserId,
          status: 1
        })

        const body = {
          status: 'rejected',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(0)
        expect(detectionUpdated.reviewStatus).toBe(0)
      })
      test('0 negative, 1 uncertain, 1 positive + 1 uncertain', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.anotherUserId,
          status: 1
        })

        const body = {
          status: 'uncertain',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(0)
        expect(detectionUpdated.reviewStatus).toBe(0)
      })
      test('0 negative, 1 uncertain, 1 positive + 1 positive', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.anotherUserId,
          status: 1
        })

        const body = {
          status: 'confirmed',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(0)
        expect(detectionUpdated.reviewStatus).toBe(1)
      })
      test('1 negative, 0 uncertain, 1 positive + 1 uncertain', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: -1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.anotherUserId,
          status: 1
        })

        const body = {
          status: 'uncertain',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(0)
        expect(detectionUpdated.reviewStatus).toBe(0)
      })
      test('1 negative, 0 uncertain, 1 positive + 1 negative', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: -1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.anotherUserId,
          status: 1
        })

        const body = {
          status: 'rejected',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(0)
        expect(detectionUpdated.reviewStatus).toBe(-1)
      })
      test('1 negative, 0 uncertain, 1 positive + 1 positive', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: -1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.anotherUserId,
          status: 1
        })

        const body = {
          status: 'confirmed',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(0)
        expect(detectionUpdated.reviewStatus).toBe(1)
      })

      test('1 negative, 1 uncertain, 1 positive + 1 negative', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: -1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.anotherUserId,
          status: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.differentUserId,
          status: 1
        })

        const body = {
          status: 'rejected',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(0)
        expect(detectionUpdated.reviewStatus).toBe(-1)
      })
      test('1 negative, 1 uncertain, 1 positive + 1 uncertain', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: -1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.anotherUserId,
          status: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.differentUserId,
          status: 1
        })

        const body = {
          status: 'uncertain',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(0)
        expect(detectionUpdated.reviewStatus).toBe(0)
      })
      test('1 negative, 1 uncertain, 1 positive + 1 positive', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: -1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.anotherUserId,
          status: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.differentUserId,
          status: 1
        })

        const body = {
          status: 'confirmed',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(0)
        expect(detectionUpdated.reviewStatus).toBe(1)
      })

      test('2 negative, 0 uncertain, 0 positive + 1 uncertain', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: -1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: -1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.anotherUserId,
          status: -1
        })

        const body = {
          status: 'uncertain',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(-1)
        expect(detectionUpdated.reviewStatus).toBe(-1)
      })
      test('2 negative, 0 uncertain, 0 positive + 1 positive', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: -1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: -1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.anotherUserId,
          status: -1
        })

        const body = {
          status: 'confirmed',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(-1)
        expect(detectionUpdated.reviewStatus).toBe(-1)
      })
      test('0 negative, 2 uncertain, 0 positive + 1 negative', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.anotherUserId,
          status: 0
        })

        const body = {
          status: 'rejected',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(0)
        expect(detectionUpdated.reviewStatus).toBe(0)
      })
      test('0 negative, 2 uncertain, 0 positive + 1 positive', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.anotherUserId,
          status: 0
        })

        const body = {
          status: 'confirmed',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(0)
        expect(detectionUpdated.reviewStatus).toBe(0)
      })
      test('0 negative, 0 uncertain, 2 positive + 1 negative', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: 1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: 1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.anotherUserId,
          status: 1
        })

        const body = {
          status: 'rejected',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(1)
        expect(detectionUpdated.reviewStatus).toBe(1)
      })
      test('0 negative, 0 uncertain, 2 positive + 1 uncertain', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: 1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: 1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.anotherUserId,
          status: 1
        })

        const body = {
          status: 'uncertain',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(1)
        expect(detectionUpdated.reviewStatus).toBe(1)
      })

      test('2 negative, 1 uncertain, 0 positive + 1 uncertain', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: -1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: -1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.anotherUserId,
          status: -1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.differentUserId,
          status: 0
        })

        const body = {
          status: 'uncertain',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(-1)
        expect(detectionUpdated.reviewStatus).toBe(0)
      })
      test('2 negative, 1 uncertain, 0 positive + 1 positive', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: -1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: -1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.anotherUserId,
          status: -1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.differentUserId,
          status: 0
        })

        const body = {
          status: 'confirmed',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(-1)
        expect(detectionUpdated.reviewStatus).toBe(-1)
      })
      test('2 negative, 0 uncertain, 1 positive + 1 uncertain', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: -1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: -1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.anotherUserId,
          status: -1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.differentUserId,
          status: 1
        })

        const body = {
          status: 'uncertain',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(-1)
        expect(detectionUpdated.reviewStatus).toBe(-1)
      })
      test('2 negative, 0 uncertain, 1 positive + 1 positive', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: -1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: -1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.anotherUserId,
          status: -1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.differentUserId,
          status: 1
        })

        const body = {
          status: 'confirmed',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(-1)
        expect(detectionUpdated.reviewStatus).toBe(0)
      })
      test('1 negative, 2 uncertain, 0 positive + 1 negative', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: -1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.anotherUserId,
          status: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.differentUserId,
          status: 0
        })

        const body = {
          status: 'rejected',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(0)
        expect(detectionUpdated.reviewStatus).toBe(0)
      })
      test('1 negative, 2 uncertain, 0 positive + 1 positive', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: -1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.anotherUserId,
          status: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.differentUserId,
          status: 0
        })

        const body = {
          status: 'confirmed',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(0)
        expect(detectionUpdated.reviewStatus).toBe(0)
      })
      test('0 negative, 2 uncertain, 1 positive + 1 negative', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.anotherUserId,
          status: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.differentUserId,
          status: 1
        })

        const body = {
          status: 'rejected',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(0)
        expect(detectionUpdated.reviewStatus).toBe(0)
      })
      test('0 negative, 2 uncertain, 1 positive + 1 positive', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.anotherUserId,
          status: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.differentUserId,
          status: 1
        })

        const body = {
          status: 'confirmed',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(0)
        expect(detectionUpdated.reviewStatus).toBe(0)
      })
      test('1 negative, 0 uncertain, 2 positive + 1 negative', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: 1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: -1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.anotherUserId,
          status: 1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.differentUserId,
          status: 1
        })

        const body = {
          status: 'rejected',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(1)
        expect(detectionUpdated.reviewStatus).toBe(0)
      })
      test('1 negative, 0 uncertain, 2 positive + 1 uncertain', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: 1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: -1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.anotherUserId,
          status: 1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.differentUserId,
          status: 1
        })

        const body = {
          status: 'uncertain',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(1)
        expect(detectionUpdated.reviewStatus).toBe(1)
      })
      test('0 negative, 1 uncertain, 2 positive + 1 negative', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: 1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.anotherUserId,
          status: 1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.differentUserId,
          status: 1
        })

        const body = {
          status: 'rejected',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(1)
        expect(detectionUpdated.reviewStatus).toBe(1)
      })
      test('0 negative, 1 uncertain, 2 positive + 1 uncertain', async () => {
        const { stream, classification, classifier } = await commonSetup()
        const start = '2022-01-01T00:00:00.000Z'
        const detection = await models.Detection.create({
          streamId: stream.id,
          classificationId: classification.id,
          classifierId: classifier.id,
          start: start,
          end: '2022-01-01T00:00:01.000Z',
          confidence: 0.99,
          reviewStatus: 1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.otherUserId,
          status: 0
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.anotherUserId,
          status: 1
        })
        await DetectionReview.create({
          detectionId: detection.toJSON().id,
          userId: seedValues.differentUserId,
          status: 1
        })

        const body = {
          status: 'uncertain',
          classification: classification.value,
          classifier: classifier.id
        }
        await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(1)
        expect(detectionUpdated.reviewStatus).toBe(0)
      })
    })
  })
  describe('classifier job summary refresh', () => {
    test('updates confirmed to 1', async () => {
      const { stream, classification, classifier, job } = await commonSetup()

      const start = '2022-01-01T00:00:00.000Z'
      await models.Detection.create({
        streamId: stream.id,
        classificationId: classification.id,
        classifierId: classifier.id,
        start,
        end: '2022-01-01T00:00:01.000Z',
        confidence: 0.99,
        classifierJobId: job.id
      })
      await models.ClassifierJobSummary.create({ classifierJobId: job.id, classificationId: classification.id, total: 1, confirmed: 0, rejected: 0, uncertain: 0 })
      const body = {
        status: 'confirmed',
        classification: classification.value,
        classifier: classifier.id
      }
      await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

      const summaries = await models.ClassifierJobSummary.findAll()
      expect(summaries.length).toBe(1)
      expect(summaries[0].total).toBe(1)
      expect(summaries[0].confirmed).toBe(1)
      expect(summaries[0].rejected).toBe(0)
      expect(summaries[0].uncertain).toBe(0)
    })
    test('updates confirmed to 2', async () => {
      const { stream, classification, classifier, job } = await commonSetup()

      const start = '2022-01-01T00:00:00.000Z'
      await models.Detection.create({
        streamId: stream.id,
        classificationId: classification.id,
        classifierId: classifier.id,
        start,
        end: '2022-01-01T00:00:01.000Z',
        confidence: 0.99,
        classifierJobId: job.id
      })
      await models.ClassifierJobSummary.create({ classifierJobId: job.id, classificationId: classification.id, total: 1, confirmed: 1, rejected: 0, uncertain: 0 })
      const body = {
        status: 'confirmed',
        classification: classification.value,
        classifier: classifier.id
      }
      await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

      const summaries = await models.ClassifierJobSummary.findAll()
      expect(summaries.length).toBe(1)
      expect(summaries[0].total).toBe(1)
      expect(summaries[0].confirmed).toBe(2)
      expect(summaries[0].rejected).toBe(0)
      expect(summaries[0].uncertain).toBe(0)
    })
  })
  test('updates rejected to 1', async () => {
    const { stream, classification, classifier, job } = await commonSetup()

    const start = '2022-01-01T00:00:00.000Z'
    await models.Detection.create({
      streamId: stream.id,
      classificationId: classification.id,
      classifierId: classifier.id,
      start,
      end: '2022-01-01T00:00:01.000Z',
      confidence: 0.99,
      classifierJobId: job.id
    })
    await models.ClassifierJobSummary.create({ classifierJobId: job.id, classificationId: classification.id, total: 1, confirmed: 0, rejected: 0, uncertain: 0 })
    const body = {
      status: 'rejected',
      classification: classification.value,
      classifier: classifier.id
    }
    await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

    const summaries = await models.ClassifierJobSummary.findAll()
    expect(summaries.length).toBe(1)
    expect(summaries[0].total).toBe(1)
    expect(summaries[0].confirmed).toBe(0)
    expect(summaries[0].rejected).toBe(1)
    expect(summaries[0].uncertain).toBe(0)
  })
  test('updates rejected to 2', async () => {
    const { stream, classification, classifier, job } = await commonSetup()

    const start = '2022-01-01T00:00:00.000Z'
    await models.Detection.create({
      streamId: stream.id,
      classificationId: classification.id,
      classifierId: classifier.id,
      start,
      end: '2022-01-01T00:00:01.000Z',
      confidence: 0.99,
      classifierJobId: job.id
    })
    await models.ClassifierJobSummary.create({ classifierJobId: job.id, classificationId: classification.id, total: 1, confirmed: 0, rejected: 1, uncertain: 0 })
    const body = {
      status: 'rejected',
      classification: classification.value,
      classifier: classifier.id
    }
    await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

    const summaries = await models.ClassifierJobSummary.findAll()
    expect(summaries.length).toBe(1)
    expect(summaries[0].total).toBe(1)
    expect(summaries[0].confirmed).toBe(0)
    expect(summaries[0].rejected).toBe(2)
    expect(summaries[0].uncertain).toBe(0)
  })
  test('updates uncertain to 1', async () => {
    const { stream, classification, classifier, job } = await commonSetup()

    const start = '2022-01-01T00:00:00.000Z'
    await models.Detection.create({
      streamId: stream.id,
      classificationId: classification.id,
      classifierId: classifier.id,
      start,
      end: '2022-01-01T00:00:01.000Z',
      confidence: 0.99,
      classifierJobId: job.id
    })
    await models.ClassifierJobSummary.create({ classifierJobId: job.id, classificationId: classification.id, total: 1, confirmed: 0, rejected: 0, uncertain: 0 })
    const body = {
      status: 'uncertain',
      classification: classification.value,
      classifier: classifier.id
    }
    await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

    const summaries = await models.ClassifierJobSummary.findAll()
    expect(summaries.length).toBe(1)
    expect(summaries[0].total).toBe(1)
    expect(summaries[0].confirmed).toBe(0)
    expect(summaries[0].rejected).toBe(0)
    expect(summaries[0].uncertain).toBe(1)
  })
  test('updates uncertain to 2', async () => {
    const { stream, classification, classifier, job } = await commonSetup()

    const start = '2022-01-01T00:00:00.000Z'
    await models.Detection.create({
      streamId: stream.id,
      classificationId: classification.id,
      classifierId: classifier.id,
      start,
      end: '2022-01-01T00:00:01.000Z',
      confidence: 0.99,
      classifierJobId: job.id
    })
    await models.ClassifierJobSummary.create({ classifierJobId: job.id, classificationId: classification.id, total: 1, confirmed: 0, rejected: 0, uncertain: 1 })
    const body = {
      status: 'uncertain',
      classification: classification.value,
      classifier: classifier.id
    }
    await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

    const summaries = await models.ClassifierJobSummary.findAll()
    expect(summaries.length).toBe(1)
    expect(summaries[0].total).toBe(1)
    expect(summaries[0].confirmed).toBe(0)
    expect(summaries[0].rejected).toBe(0)
    expect(summaries[0].uncertain).toBe(2)
  })
  test('does not update job summary if detections is not from the job', async () => {
    const { stream, classification, classifier, job } = await commonSetup()

    const start = '2022-01-01T00:00:00.000Z'
    await models.Detection.create({
      streamId: stream.id,
      classificationId: classification.id,
      classifierId: classifier.id,
      start,
      end: '2022-01-01T00:00:01.000Z',
      confidence: 0.99
    })
    await models.ClassifierJobSummary.create({ classifierJobId: job.id, classificationId: classification.id, total: 1, confirmed: 0, rejected: 0, uncertain: 0 })
    const body = {
      status: 'confirmed',
      classification: classification.value,
      classifier: classifier.id
    }
    await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

    const summaries = await models.ClassifierJobSummary.findAll()
    expect(summaries.length).toBe(1)
    expect(summaries[0].total).toBe(1)
    expect(summaries[0].confirmed).toBe(0)
    expect(summaries[0].rejected).toBe(0)
    expect(summaries[0].uncertain).toBe(0)
  })
  test('updates job summary if detection is from another job and classifier job is not set in request body', async () => {
    const { stream, classification, classifier, job2 } = await commonSetup()

    const start = '2022-01-01T00:00:00.000Z'
    await models.Detection.create({
      streamId: stream.id,
      classificationId: classification.id,
      classifierId: classifier.id,
      start,
      end: '2022-01-01T00:00:01.000Z',
      confidence: 0.99,
      classifierJobId: job2.id
    })
    await models.ClassifierJobSummary.create({ classifierJobId: job2.id, classificationId: classification.id, total: 1, confirmed: 0, rejected: 0, uncertain: 0 })
    const body = {
      status: 'confirmed',
      classification: classification.value,
      classifier: classifier.id
    }
    await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

    const summaries = await models.ClassifierJobSummary.findAll()
    expect(summaries.length).toBe(1)
    expect(summaries[0].total).toBe(1)
    expect(summaries[0].confirmed).toBe(1)
    expect(summaries[0].rejected).toBe(0)
    expect(summaries[0].uncertain).toBe(0)
  })
  test('does not update job summary if detection is from another job and classifier job is set in request body', async () => {
    const { stream, classification, classifier, job2 } = await commonSetup()

    const start = '2022-01-01T00:00:00.000Z'
    await models.Detection.create({
      streamId: stream.id,
      classificationId: classification.id,
      classifierId: classifier.id,
      start,
      end: '2022-01-01T00:00:01.000Z',
      confidence: 0.99,
      classifierJobId: job2.id
    })
    await models.ClassifierJobSummary.create({ classifierJobId: job2.id, classificationId: classification.id, total: 1, confirmed: 0, rejected: 0, uncertain: 0 })
    const body = {
      status: 'confirmed',
      classification: classification.value,
      classifier: classifier.id,
      classifier_job: job2.id
    }
    await request(app).post(`/${stream.id}/detections/${start}/review`).send(body)

    const summaries = await models.ClassifierJobSummary.findAll()
    expect(summaries.length).toBe(1)
    expect(summaries[0].total).toBe(1)
    expect(summaries[0].confirmed).toBe(1)
    expect(summaries[0].rejected).toBe(0)
    expect(summaries[0].uncertain).toBe(0)
  })
})

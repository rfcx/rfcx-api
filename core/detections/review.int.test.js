const request = require('supertest')
const routes = require('./review')
const models = require('../_models')
const { expressApp, seedValues, truncateNonBase, muteConsole } = require('../../common/testing/sequelize')
const { DetectionReview } = require('../_models')

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
  const stream = (await models.Stream.findOrCreate({ where: { id: 'abc', name: 'my stream', createdById: seedValues.primaryUserId } }))[0]
  const classification = (await models.Classification.findOrCreate({ where: { value: 'chainsaw', title: 'Chainsaw', typeId: 1, source_id: 1 } }))[0]
  const classifier = await models.Classifier.create({ externalId: 'cccddd', name: 'chainsaw model', version: 1, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: 's3://something' })
  const classifierOutput = { classifierId: classifier.id, classificationId: classification.id, outputClassName: 'chnsw', ignoreThreshold: 0.1 }
  await models.ClassifierOutput.create(classifierOutput)
  return { stream, classification, classifier, classifierOutput }
}

describe('POST /:streamId/detections/:start/review', () => {
  describe('failed cases', () => {
    test('stream not found', async () => {
      await commonSetup()
      const response = await request(app).post('/str/detections/2022-01-01T00:00:00.000Z/review').send({ status: 'confirmed' })

      expect(response.statusCode).toBe(404)
      expect(response.body.message).toBe('stream with given id doesn\'t exist.')
    })
    test('detection not found', async () => {
      const { stream, classification, classifier } = await commonSetup()
      await models.Detection.create({
        streamId: stream.id,
        classificationId: classification.id,
        classifierId: classifier.id,
        start: '2022-01-01T00:00:00.000Z',
        end: '2022-01-01T00:00:01.000Z',
        confidence: 0.99
      })
      const response = await request(app).post(`/${stream.id}/detections/2022-02-01T00:00:00.000Z/review`).send({ status: 'confirmed' })

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
      const response = await request(app).post(`/${stream2.id}/detections/${start}/review`).send({ status: 'confirmed' })

      expect(response.statusCode).toBe(403)
      expect(response.body.message).toBe('You do not have permission to review detections in this stream.')
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
        confidence: 0.99
      })

      const response = await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'confirmed' })

      expect(response.statusCode).toBe(201)
      expect(response.header.location).toMatch(/^\/detections\/reviews\/[0-9]+$/)
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

      const response = await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'rejected' })

      expect(response.statusCode).toBe(201)
      expect(response.header.location).toMatch(/^\/detections\/reviews\/[0-9]+$/)
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

      const response = await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'uncertain' })

      expect(response.statusCode).toBe(201)
      expect(response.header.location).toMatch(/^\/detections\/reviews\/[0-9]+$/)
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

      const response1 = await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'rejected' })
      expect(response1.statusCode).toBe(201)
      expect(response1.header.location).toMatch(/^\/detections\/reviews\/[0-9]+$/)
      const review1 = await models.DetectionReview.findOne({ where: { detectionId: detection.toJSON().id } })
      expect(review1.status).toBe(-1)
      const detectionUpdated1 = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
      expect(detectionUpdated1.reviewStatus).toBe(-1)

      const response2 = await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'uncertain' })
      expect(response2.statusCode).toBe(204)
      expect(response2.header.location).toMatch(/^\/detections\/reviews\/[0-9]+$/)
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

      const response1 = await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'rejected' })
      expect(response1.statusCode).toBe(201)
      expect(response1.header.location).toMatch(/^\/detections\/reviews\/[0-9]+$/)
      const review1 = await models.DetectionReview.findOne({ where: { detectionId: detection.toJSON().id } })
      expect(review1.status).toBe(-1)
      const detectionUpdated1 = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
      expect(detectionUpdated1.reviewStatus).toBe(-1)

      const response2 = await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'confirmed' })
      expect(response2.statusCode).toBe(204)
      expect(response2.header.location).toMatch(/^\/detections\/reviews\/[0-9]+$/)
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

      const response1 = await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'uncertain' })
      expect(response1.statusCode).toBe(201)
      expect(response1.header.location).toMatch(/^\/detections\/reviews\/[0-9]+$/)
      const review1 = await models.DetectionReview.findOne({ where: { detectionId: detection.toJSON().id } })
      expect(review1.status).toBe(0)
      const detectionUpdated1 = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
      expect(detectionUpdated1.reviewStatus).toBe(0)

      const response2 = await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'rejected' })
      expect(response2.statusCode).toBe(204)
      expect(response2.header.location).toMatch(/^\/detections\/reviews\/[0-9]+$/)
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

      const response1 = await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'uncertain' })
      expect(response1.statusCode).toBe(201)
      expect(response1.header.location).toMatch(/^\/detections\/reviews\/[0-9]+$/)
      const review1 = await models.DetectionReview.findOne({ where: { detectionId: detection.toJSON().id } })
      expect(review1.status).toBe(0)
      const detectionUpdated1 = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
      expect(detectionUpdated1.reviewStatus).toBe(0)

      const response2 = await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'confirmed' })
      expect(response2.statusCode).toBe(204)
      expect(response2.header.location).toMatch(/^\/detections\/reviews\/[0-9]+$/)
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

      const response1 = await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'confirmed' })
      expect(response1.statusCode).toBe(201)
      expect(response1.header.location).toMatch(/^\/detections\/reviews\/[0-9]+$/)
      const review1 = await models.DetectionReview.findOne({ where: { detectionId: detection.toJSON().id } })
      expect(review1.status).toBe(1)
      const detectionUpdated1 = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
      expect(detectionUpdated1.reviewStatus).toBe(1)

      const response2 = await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'rejected' })
      expect(response2.statusCode).toBe(204)
      expect(response2.header.location).toMatch(/^\/detections\/reviews\/[0-9]+$/)
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

      const response1 = await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'confirmed' })
      expect(response1.statusCode).toBe(201)
      expect(response1.header.location).toMatch(/^\/detections\/reviews\/[0-9]+$/)
      const review1 = await models.DetectionReview.findOne({ where: { detectionId: detection.toJSON().id } })
      expect(review1.status).toBe(1)
      const detectionUpdated1 = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
      expect(detectionUpdated1.reviewStatus).toBe(1)

      const response2 = await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'uncertain' })
      expect(response2.statusCode).toBe(204)
      expect(response2.header.location).toMatch(/^\/detections\/reviews\/[0-9]+$/)
      const review2 = await models.DetectionReview.findOne({ where: { detectionId: detection.toJSON().id } })
      expect(review1.id).toBe(review2.id)
      expect(review2.status).toBe(0)
      const detectionUpdated2 = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
      expect(detectionUpdated2.reviewStatus).toBe(0)
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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'rejected' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'uncertain' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'confirmed' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'uncertain' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'rejected' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'confirmed' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'confirmed' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'rejected' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'uncertain' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'confirmed' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'rejected' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'uncertain' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'rejected' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'uncertain' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'confirmed' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'uncertain' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'rejected' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'confirmed' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'rejected' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'uncertain' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'confirmed' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'uncertain' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'confirmed' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'rejected' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'confirmed' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'rejected' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'uncertain' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'uncertain' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'confirmed' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'uncertain' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'confirmed' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'rejected' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'confirmed' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'rejected' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'confirmed' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'rejected' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'uncertain' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'rejected' })

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

        await request(app).post(`/${stream.id}/detections/${start}/review`).send({ status: 'uncertain' })

        const detectionUpdated = await models.Detection.findOne({ where: { id: detection.toJSON().id } })
        expect(detection.reviewStatus).toBe(1)
        expect(detectionUpdated.reviewStatus).toBe(0)
      })
    })
  })
})

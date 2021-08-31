const request = require('supertest')
const moment = require('moment')
const routes = require('.')
const { migrate, truncate, expressApp, seed, seedValues, muteConsole } = require('../../../utils/sequelize/testing')
const models = require('../../../modelsTimescale')
const { Project, Stream, Classification, Classifier, DetectionReview, Detection } = require('../../../modelsTimescale')

const app = expressApp()

app.use('/', routes)

beforeAll(async () => {
  muteConsole()
  await migrate(models.sequelize, models.Sequelize)
  await seed(models)
})
beforeEach(async () => {
  console.log('\n\nDETECTION REVIEW BEFORE EACH\n\n')
  await truncate(models)
})

async function commonSetup () {
  const project = { id: 'project1', name: 'my project 1', createdById: seedValues.primaryUserId }
  await Project.create(project)
  const stream = { id: 'abc', name: 'my stream', createdById: seedValues.primaryUserId, project_id: project.id }
  await Stream.create(stream)
  const classification = { id: 6, value: 'chainsaw', title: 'Chainsaw', type_id: 1, source_id: 1 }
  await Classification.create(classification)
  const classifier = { id: 3, externalId: 'cccddd', name: 'chainsaw model', version: 1, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: 's3://something' }
  await Classifier.create(classifier)
  const detection = {
    id: 1,
    stream_id: stream.id,
    classifier_id: classifier.id,
    classification_id: classification.id,
    start: '2021-05-11T00:05:00Z',
    end: '2021-05-11T00:05:05Z',
    confidence: 0.99
  }
  await Detection.create(detection)
  return { stream, project, classification, classifier, detection }
}

describe('POST /detections/:id/:start/review', () => {
  test('detection not found', async () => {
    const { detection } = await commonSetup()
    const body = {
      positive: true
    }
    const response = await request(app).post(`/${detection.id}/2020-01-01T00:00:00.000Z/review`).send(body)
    expect(response.statusCode).toBe(404)
  })
  test('detection review is created, review_status is 1', async () => {
    const { detection } = await commonSetup()
    const body = {
      positive: true
    }
    const response = await request(app).post(`/${detection.id}/${moment.utc(detection.start).toISOString()}/review`).send(body)
    const dbDetection = await Detection.findOne({ where: { id: detection.id } })
    const dbDetectionReviews = await DetectionReview.findAll({ where: { detection_id: detection.id } })
    expect(response.statusCode).toBe(201)
    expect(dbDetection.review_status).toBe(1)
    expect(dbDetectionReviews.length).toBe(1)
    expect(dbDetectionReviews[0].positive).toBeTruthy()
  })
  test('detection review is created, review_status is -1', async () => {
    const { detection } = await commonSetup()
    const body = {
      positive: false
    }
    const response = await request(app).post(`/${detection.id}/${moment.utc(detection.start).toISOString()}/review`).send(body)
    const dbDetection = await Detection.findOne({ where: { id: detection.id } })
    const dbDetectionReviews = await DetectionReview.findAll({ where: { detection_id: detection.id } })
    expect(response.statusCode).toBe(201)
    expect(dbDetection.review_status).toBe(-1)
    expect(dbDetectionReviews.length).toBe(1)
    expect(dbDetectionReviews[0].positive).toBeFalsy()
  })
  test('when user reviews same detection again, previous negative review is deleted', async () => {
    const { detection } = await commonSetup()
    await request(app).post(`/${detection.id}/${moment.utc(detection.start).toISOString()}/review`).send({ positive: false })
    await request(app).post(`/${detection.id}/${moment.utc(detection.start).toISOString()}/review`).send({ positive: true })
    const dbDetection = await Detection.findOne({ where: { id: detection.id } })
    const dbDetectionReviews = await DetectionReview.findAll({ where: { detection_id: detection.id } })
    expect(dbDetection.review_status).toBe(1)
    expect(dbDetectionReviews.length).toBe(1)
    expect(dbDetectionReviews[0].positive).toBeTruthy()
  })
  test('when user reviews same detection again, previous positive review is deleted', async () => {
    const { detection } = await commonSetup()
    await request(app).post(`/${detection.id}/${moment.utc(detection.start).toISOString()}/review`).send({ positive: true })
    await request(app).post(`/${detection.id}/${moment.utc(detection.start).toISOString()}/review`).send({ positive: false })
    const dbDetection = await Detection.findOne({ where: { id: detection.id } })
    const dbDetectionReviews = await DetectionReview.findAll({ where: { detection_id: detection.id } })
    expect(dbDetection.review_status).toBe(-1)
    expect(dbDetectionReviews.length).toBe(1)
    expect(dbDetectionReviews[0].positive).toBeFalsy()
  })
  test('when there was one positive review and one negative is created, review_status is changed to -1', async () => {
    const { detection } = await commonSetup()
    await DetectionReview.create({
      detection_id: detection.id,
      user_id: seedValues.anotherUserId,
      positive: true
    })
    await request(app).post(`/${detection.id}/${moment.utc(detection.start).toISOString()}/review`).send({ positive: false })
    const dbDetection = await Detection.findOne({ where: { id: detection.id } })
    const dbDetectionReviews = await DetectionReview.findAll({ where: { detection_id: detection.id } })
    expect(dbDetection.review_status).toBe(-1)
    expect(dbDetectionReviews.length).toBe(2)
  })
  test('when there was one negative review and one positive is created, review_status is still -1', async () => {
    const { detection } = await commonSetup()
    await DetectionReview.create({
      detection_id: detection.id,
      user_id: seedValues.otherUserId,
      positive: false
    })
    await request(app).post(`/${detection.id}/${moment.utc(detection.start).toISOString()}/review`).send({ positive: true })
    const dbDetection = await Detection.findOne({ where: { id: detection.id } })
    const dbDetectionReviews = await DetectionReview.findAll({ where: { detection_id: detection.id } })
    expect(dbDetection.review_status).toBe(-1)
    expect(dbDetectionReviews.length).toBe(2)
  })
  test('when there was one negative review and another negative is created, review_status is still -1', async () => {
    const { detection } = await commonSetup()
    await DetectionReview.create({
      detection_id: detection.id,
      user_id: seedValues.otherUserId,
      positive: false
    })
    await request(app).post(`/${detection.id}/${moment.utc(detection.start).toISOString()}/review`).send({ positive: false })
    const dbDetection = await Detection.findOne({ where: { id: detection.id } })
    const dbDetectionReviews = await DetectionReview.findAll({ where: { detection_id: detection.id } })
    expect(dbDetection.review_status).toBe(-1)
    expect(dbDetectionReviews.length).toBe(2)
  })
  test('when there was one positive review and another positive is created, review_status is still 1', async () => {
    const { detection } = await commonSetup()
    await DetectionReview.create({
      detection_id: detection.id,
      user_id: seedValues.otherUserId,
      positive: true
    })
    await request(app).post(`/${detection.id}/${moment.utc(detection.start).toISOString()}/review`).send({ positive: true })
    const dbDetection = await Detection.findOne({ where: { id: detection.id } })
    const dbDetectionReviews = await DetectionReview.findAll({ where: { detection_id: detection.id } })
    expect(dbDetection.review_status).toBe(1)
    expect(dbDetectionReviews.length).toBe(2)
  })
  test('when there were two positive reviews and one negative is created, review_status is still 1', async () => {
    const { detection } = await commonSetup()
    await DetectionReview.create({
      detection_id: detection.id,
      user_id: seedValues.otherUserId,
      positive: true
    })
    await DetectionReview.create({
      detection_id: detection.id,
      user_id: seedValues.anotherUserId,
      positive: true
    })
    await request(app).post(`/${detection.id}/${moment.utc(detection.start).toISOString()}/review`).send({ positive: false })
    const dbDetection = await Detection.findOne({ where: { id: detection.id } })
    const dbDetectionReviews = await DetectionReview.findAll({ where: { detection_id: detection.id } })
    expect(dbDetection.review_status).toBe(1)
    expect(dbDetectionReviews.length).toBe(3)
  })
  test('when there were two negative reviews and one positive is created, review_status is still -1', async () => {
    const { detection } = await commonSetup()
    await DetectionReview.create({
      detection_id: detection.id,
      user_id: seedValues.otherUserId,
      positive: false
    })
    await DetectionReview.create({
      detection_id: detection.id,
      user_id: seedValues.anotherUserId,
      positive: false
    })
    await request(app).post(`/${detection.id}/${moment.utc(detection.start).toISOString()}/review`).send({ positive: true })
    const dbDetection = await Detection.findOne({ where: { id: detection.id } })
    const dbDetectionReviews = await DetectionReview.findAll({ where: { detection_id: detection.id } })
    expect(dbDetection.review_status).toBe(-1)
    expect(dbDetectionReviews.length).toBe(3)
  })
})

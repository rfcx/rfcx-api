const request = require('supertest')
const router = require('./list-summary')
const models = require('../_models')
const { expressApp, truncateNonBase, seedValues } = require('../../common/testing/sequelize')

const app = expressApp()

app.use('/', router)

beforeEach(async () => {
  await truncateNonBase(models)
})

afterAll(async () => {
  await models.sequelize.close()
})

async function commonSetup () {
  const project = await models.Project.create({
    id: 'kdmi944kkkls',
    name: 'Biodiversity of Brussels',
    createdById: seedValues.primaryUserId
  })
  await models.UserProjectRole.create({
    user_id: project.createdById,
    project_id: project.id,
    role_id: seedValues.roleOwner
  })
  const stream = {
    id: 'seib949gilfa',
    name: 'B11',
    createdById: seedValues.primaryUserId,
    projectId: project.id
  }
  await models.Stream.create(stream)
  const classification = {
    id: 6,
    value: 'chainsaw',
    title: 'Chainsaw',
    typeId: 1,
    sourceId: 1
  }
  await models.Classification.create(classification)
  const classifier = {
    id: 3,
    externalId: 'cccddd',
    name: 'chainsaw model',
    version: 1,
    createdById: seedValues.otherUserId,
    modelRunner: 'tf2',
    modelUrl: 's3://somewhere'
  }
  await models.Classifier.create(classifier)
  const job1 = await models.ClassifierJob.create({
    created_at: '2023-01-01 07:00',
    classifierId: classifier.id,
    projectId: project.id,
    createdById: seedValues.primaryUserId
  })
  const job2 = await models.ClassifierJob.create({
    created_at: '2023-01-02 08:35',
    classifierId: classifier.id,
    projectId: project.id,
    createdById: seedValues.primaryUserId
  })

  return {
    project,
    stream,
    classification,
    classifier,
    job1,
    job2
  }
}

describe('GET /detections/summary', () => {
  test('success', async () => {
    const {
      stream,
      classifier,
      classification
    } = await commonSetup()

    await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2023-01-12T02:00:00.000Z',
      end: '2023-01-12T02:00:05.000Z',
      confidence: 0.45
    })

    const query = {
      start: '2023-01-01T00:00:00.000Z',
      end: '2023-01-31T23:59:59.999Z',
      min_confidence: 0.1
    }

    const response = await request(app).get('/summary').query(query)

    expect(response.statusCode).toEqual(200)
    expect(response.body).toEqual({
      unreviewed: 1,
      rejected: 0,
      uncertain: 0,
      confirmed: 0
    })
  })

  test('get 1 unreviewed detection given start, end, and classifier_jobs', async () => {
    const {
      stream,
      classifier,
      classification,
      job1,
      job2
    } = await commonSetup()

    await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2023-01-11T00:05:00.000Z',
      end: '2023-01-11T00:05:05.000Z',
      confidence: 0.95,
      classifier_job_id: job2.id
    })
    await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2023-01-11T00:15:00.000Z',
      end: '2023-01-11T00:15:05.000Z',
      confidence: 0.95,
      classifier_job_id: job1.id
    })

    const query = {
      start: '2023-01-01T00:00:00.000Z',
      end: '2023-01-31T23:59:59.999Z',
      classifier_jobs: [job1.id]
    }

    const response = await request(app).get('/summary').query(query)

    expect(response.statusCode).toEqual(200)
    expect(response.body).toEqual({
      unreviewed: 1,
      rejected: 0,
      uncertain: 0,
      confirmed: 0
    })
  })

  test('get information from 2 jobs', async () => {
    const {
      stream,
      classifier,
      classification,
      job1,
      job2
    } = await commonSetup()

    await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2023-01-11T00:05:00.000Z',
      end: '2023-01-11T00:05:05.000Z',
      confidence: 0.95,
      classifier_job_id: job2.id
    })
    await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2023-01-11T00:15:00.000Z',
      end: '2023-01-11T00:15:05.000Z',
      confidence: 0.95,
      classifier_job_id: job1.id
    })

    const query = {
      start: '2023-01-01T00:00:00.000Z',
      end: '2023-01-31T23:59:59.999Z',
      classifier_jobs: [job1.id, job2.id]
    }

    const response = await request(app).get('/summary').query(query)

    expect(response.statusCode).toEqual(200)
    expect(response.body).toEqual({
      unreviewed: 2,
      rejected: 0,
      uncertain: 0,
      confirmed: 0
    })
  })

  test('get counts using all reviewed status', async () => {
    const { stream, classifier, classification, job1, job2 } = await commonSetup()

    await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2023-01-11T00:05:00.000Z',
      end: '2023-01-11T00:05:05.000Z',
      confidence: 0.95
    })
    await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2023-01-11T00:15:00.000Z',
      end: '2023-01-11T00:15:05.000Z',
      confidence: 0.95,
      classifier_job_id: job1.id,
      reviewStatus: -1
    })
    await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2023-01-11T00:25:00.000Z',
      end: '2023-01-11T00:25:05.000Z',
      confidence: 0.95,
      classifier_job_id: job2.id,
      reviewStatus: 0
    })
    await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2023-01-11T00:35:00.000Z',
      end: '2023-01-11T00:35:05.000Z',
      confidence: 0.95,
      classifier_job_id: job2.id,
      reviewStatus: 1
    })

    const query = {
      start: '2023-01-01T00:00:00.000Z',
      end: '2023-01-31T23:59:59.999Z',
      review_statuses: [
        'rejected',
        'uncertain',
        'confirmed'
      ]
    }

    const response = await request(app).get('/summary').query(query)

    expect(response.statusCode).toEqual(200)
    expect(response.body).toEqual({
      unreviewed: 0,
      confirmed: 1,
      rejected: 1,
      uncertain: 1
    })
  })

  test('get using classification id', async () => {
    const { stream, classifier, classification } = await commonSetup()

    await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2023-01-11T00:05:00.000Z',
      end: '2023-01-11T00:05:05.000Z',
      confidence: 0.95
    })
    await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2023-01-11T00:15:00.000Z',
      end: '2023-01-11T00:15:05.000Z',
      confidence: 0.95,
      reviewStatus: -1
    })

    const query = {
      start: '2023-01-01T00:00:00.000Z',
      end: '2023-01-31T23:59:59.999Z',
      classifications: [classification.value]
    }

    const response = await request(app).get('/summary').query(query)

    expect(response.statusCode).toEqual(200)
    expect(response.body).toEqual({
      unreviewed: 1,
      rejected: 1,
      uncertain: 0,
      confirmed: 0
    })
  })

  test('get using project id', async () => {
    const { stream, classifier, classification } = await commonSetup()

    await models.Detection.create({
      streamId: stream.id,
      projectId: stream.projectId,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2023-01-11T00:05:00.000Z',
      end: '2023-01-11T00:05:05.000Z',
      confidence: 0.95
    })
    await models.Detection.create({
      streamId: stream.id,
      projectId: stream.projectId,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2023-01-11T00:15:00.000Z',
      end: '2023-01-11T00:15:05.000Z',
      confidence: 0.95,
      reviewStatus: -1
    })

    const query = {
      start: '2023-01-01T00:00:00.000Z',
      end: '2023-01-31T23:59:59.999Z',
      projects: [stream.projectId]
    }

    const response = await request(app).get('/summary').query(query)

    expect(response.statusCode).toEqual(200)
    expect(response.body).toEqual({
      unreviewed: 1,
      rejected: 1,
      uncertain: 0,
      confirmed: 0
    })
  })

  test('get using classifierId', async () => {
    const { stream, classifier, classification } = await commonSetup()

    await models.Detection.create({
      streamId: stream.id,
      projectId: stream.projectId,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2023-01-11T00:05:00.000Z',
      end: '2023-01-11T00:05:05.000Z',
      confidence: 0.95
    })
    await models.Detection.create({
      streamId: stream.id,
      projectId: stream.projectId,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2023-01-11T00:15:00.000Z',
      end: '2023-01-11T00:15:05.000Z',
      confidence: 0.95,
      reviewStatus: -1
    })

    const query = {
      start: '2023-01-01T00:00:00.000Z',
      end: '2023-01-31T23:59:59.999Z',
      classifiers: [classifier.id]
    }

    const response = await request(app).get('/summary').query(query)

    expect(response.statusCode).toEqual(200)
    expect(response.body).toEqual({
      unreviewed: 1,
      rejected: 1,
      uncertain: 0,
      confirmed: 0
    })
  })

  test('get using unreviewed and confirmed status', async () => {
    const { stream, classifier, classification } = await commonSetup()

    await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2023-01-11T00:05:00.000Z',
      end: '2023-01-11T00:05:05.000Z',
      confidence: 0.95
    })
    await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2023-01-11T00:15:00.000Z',
      end: '2023-01-11T00:15:05.000Z',
      confidence: 0.95,
      reviewStatus: -1
    })

    const query = {
      start: '2023-01-01T00:00:00.000Z',
      end: '2023-01-31T23:59:59.999Z',
      review_statuses: [
        'unreviewed',
        'confirmed'
      ]
    }

    const response = await request(app).get('/summary').query(query)

    expect(response.statusCode).toEqual(200)
    expect(response.body).toEqual({
      unreviewed: 1,
      rejected: 0,
      uncertain: 0,
      confirmed: 0
    })
  })

  test('return 400 if last review_statuses is incorrect', async () => {
    const query = {
      start: '2021-05-11T00:00:00.000Z',
      end: '2021-05-11T00:59:59.999Z',
      review_statuses: ['uncertain', 'unreviewed', 'confirm']
    }

    const response = await request(app).get('/summary').query(query)

    expect(response.statusCode).toBe(400)
    expect(response.body.message).toBe('Validation errors: Parameter \'review_statuses\' should be one of these values: unreviewed, rejected, uncertain, confirmed.')
  })
})

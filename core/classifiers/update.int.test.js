const request = require('supertest')
const routes = require('.')
const models = require('../_models')
const { expressApp, seedValues, truncateNonBase } = require('../../common/testing/sequelize')

const app = expressApp({ has_system_role: true })

app.use('/', routes)

const CLASSIFICATION_1 = { id: 1, value: 'chainsaw', title: 'chainsaw', typeId: 1, sourceId: null, parent_id: null, source_external_id: null, created_at: '2022-06-29 11:22:37.094935' }
const CLASSIFICATION_2 = { id: 2, value: 'vehicle', title: 'vehicle', typeId: 1, sourceId: null, parent_id: null, source_external_id: null, created_at: '2022-06-29 11:22:37.094935' }
const CLASSIFICATIONS = [CLASSIFICATION_1, CLASSIFICATION_2]

async function commonSetup () {
  await models.Classification.bulkCreate(CLASSIFICATIONS)
}

beforeEach(async () => {
  await commonSetup()
})
afterEach(async () => {
  await truncateNonBase(models)
})
afterAll(async () => {
  await models.sequelize.close()
})

describe('PATCH /classifiers/:id', () => {
  test('normal user is forbidden', async () => {
    const regularUserApp = expressApp({ is_super: false })
    regularUserApp.use('/', routes)
    console.warn = jest.fn()
    const requestBody = { status: 20 }

    const response = await request(regularUserApp).patch('/x').send(requestBody)

    expect(response.statusCode).toBe(403)
    expect(console.warn).toHaveBeenCalled()
  })

  test('super user can update any classifier', async () => {
    const superUserApp = expressApp({ is_super: true })
    superUserApp.use('/', routes)
    console.warn = jest.fn()
    const classifier = { id: 5, name: 'chainsaw', version: 1, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: '' }
    const deployment = { classifierId: classifier.id, status: 20, start: new Date(), createdById: seedValues.otherUserId }
    await models.Classifier.create(classifier)
    await models.ClassifierDeployment.create(deployment)
    const requestBody = { status: 20 }

    const response = await request(superUserApp).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(200)
  })

  test('not found', async () => {
    console.warn = jest.fn()
    const requestBody = { status: 20 }

    const response = await request(app).patch('/9999999').send(requestBody)

    expect(response.statusCode).toBe(404)
    expect(console.warn).toHaveBeenCalled()
  })

  test('update classifier from staging to production', async () => {
    console.warn = jest.fn()
    const classifier = { id: 5, name: 'chainsaw', version: 1, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: '' }
    const deployment = { classifierId: classifier.id, status: 20, start: new Date(), createdById: seedValues.otherUserId }
    await models.Classifier.create(classifier)
    await models.ClassifierDeployment.create(deployment)
    const requestBody = { status: 30 }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(200)
    const deployments = await models.ClassifierDeployment.findAll({ order: ['status'] })
    expect(deployments.length).toBe(2)
    expect(deployments[0].end).not.toBeNull()
    expect(deployments[0].status).toBe(20)
    expect(deployments[1].status).toBe(30)
  })

  test('update classifier without new deployment', async () => {
    console.warn = jest.fn()
    const classifier = { id: 5, name: 'chainsaw', version: 1, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: 's3://test/xyz.tar.gz' }
    const deployment = { classifierId: classifier.id, status: 20, start: new Date(), createdById: seedValues.otherUserId }
    await models.Classifier.create(classifier)
    await models.ClassifierDeployment.create(deployment)
    const requestBody = { modelUrl: 's3://new-test/abc.tar.gz' }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(200)
    const deployments = await models.ClassifierDeployment.findAll({ where: { classifierId: classifier.id } })
    expect(deployments).toHaveLength(1)
  })

  test('update classifier with empty status', async () => {
    console.warn = jest.fn()
    const classifier = { id: 5, name: 'chainsaw', version: 1, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: 's3://test/xyz.tar.gz' }
    const deployment = { classifierId: classifier.id, status: 20, start: new Date(), createdById: seedValues.otherUserId }
    await models.Classifier.create(classifier)
    await models.ClassifierDeployment.create(deployment)
    const requestBody = { status: '', modelUrl: 's3://new-test/abc.tar.gz' }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(400)
  })

  test('update classifier with new url and status', async () => {
    console.warn = jest.fn()
    const classifier = { id: 5, name: 'chainsaw', version: 1, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: 's3://test/xyz.tar.gz' }
    const deployment = { classifierId: classifier.id, status: 20, start: new Date(), createdById: seedValues.otherUserId }
    await models.Classifier.create(classifier)
    await models.ClassifierDeployment.create(deployment)
    const requestBody = { status: 30, modelUrl: 's3://new-test/abc.tar.gz' }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(200)
    const deployments = await models.ClassifierDeployment.findAll({ order: ['status'] })
    const newDeployment = deployments.find(d => d.status === 30)
    expect(newDeployment).toBeDefined()
  })

  test('update classifier with new parameters', async () => {
    console.warn = jest.fn()
    const classifier = { id: 5, name: 'chainsaw', version: 1, createdById: seedValues.otherUserId, parameters: 'step=0.9', modelRunner: 'tf2', modelUrl: 's3://test/xyz.tar.gz' }
    const deployment = { classifierId: classifier.id, status: 20, start: new Date(), createdById: seedValues.otherUserId }
    await models.Classifier.create(classifier)
    await models.ClassifierDeployment.create(deployment)
    const requestBody = { parameters: 'step=0.8' }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(200)
    const updatedClassifier = await models.Classifier.findByPk(classifier.id)
    expect(updatedClassifier.parameters).toBe(requestBody.parameters)
  })

  test('update active streams', async () => {
    console.warn = jest.fn()
    const classifier = { id: 5, name: 'chainsaw', version: 1, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: '' }
    const stream = { id: 'bar-xyz-1234', name: 'test', isPublic: true, createdById: seedValues.otherUserId }
    await models.Classifier.create(classifier)
    await models.Stream.create(stream)
    const requestBody = { active_streams: 'bar-xyz-1234' }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(200)
    const activeStreams = await models.ClassifierActiveStream.findAll()
    expect(activeStreams.length).toBe(1)
    const classifierActiveStream = activeStreams.find(s => s.classifierId === classifier.id)
    expect(classifierActiveStream.streamId).toBe(requestBody.active_streams)
  })

  test('update active project', async () => {
    console.warn = jest.fn()
    const classifier = { id: 5, name: 'chainsaw', version: 1, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: '' }
    const project = { id: 'bar-xyz-1234', name: 'test', isPublic: true, createdById: seedValues.otherUserId }
    await models.Classifier.create(classifier)
    await models.Project.create(project)
    const requestBody = { active_projects: 'bar-xyz-1234' }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(200)
    const activeProjects = await models.ClassifierActiveProject.findAll()
    expect(activeProjects.length).toBe(1)
    const classifierActiveProject = activeProjects.find(s => s.classifierId === classifier.id)
    expect(classifierActiveProject.projectId).toBe(requestBody.active_projects)
  })

  test('update classifier with classification_values', async () => {
    console.warn = jest.fn()
    const classifier = { id: 5, name: 'chainsaw', version: 1, createdById: seedValues.otherUserId, parameters: 'step=0.9', modelRunner: 'tf2', modelUrl: 's3://test/xyz.tar.gz' }
    const deployment = { classifierId: classifier.id, status: 20, start: new Date(), createdById: seedValues.otherUserId }
    const classifierOutput = { classifierId: classifier.id, classificationId: CLASSIFICATION_1.id, outputClassName: 'chainsaw' }
    await models.Classifier.create(classifier)
    await models.ClassifierDeployment.create(deployment)
    await models.ClassifierOutput.create(classifierOutput)
    const requestBody = { classification_values: 'chainsaw:0.1' }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(200)
    const output = await models.ClassifierOutput.findAll({ where: { classifierId: classifier.id, classificationId: CLASSIFICATION_1.id, outputClassName: classifierOutput.outputClassName } })
    expect(output[0].ignoreThreshold).toBe(0.1)
  })
})

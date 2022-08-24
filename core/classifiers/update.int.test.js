const request = require('supertest')
const routes = require('.')
const models = require('../_models')
const { migrate, truncate, expressApp, seed, seedValues } = require('../../common/testing/sequelize')

const app = expressApp({ has_system_role: true })

app.use('/', routes)

beforeAll(async () => {
  await migrate(models.sequelize, models.Sequelize)
  await seed(models)
})
beforeEach(async () => {
  await truncate(models)
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

    const response = await request(app).patch('/not_a_classifier').send(requestBody)

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
})

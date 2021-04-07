const request = require('supertest')
const routes = require('.')
const models = require('../../../modelsTimescale')
const { migrate, truncate, expressApp, seed, seedValues } = require('../../../utils/sequelize/testing')

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
    const classifier = { id: 5, name: 'chainsaw', version: 1, created_by_id: seedValues.otherUserId, model_runner: 'tf2', model_url: '' }
    await models.Classifier.create(classifier)
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
    const classifier = { id: 5, name: 'chainsaw', version: 1, created_by_id: seedValues.otherUserId, model_runner: 'tf2', model_url: '' }
    const deployment = { classifier_id: classifier.id, status: 20, start: new Date(), created_by_id: seedValues.otherUserId }
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

  test('update classifier keeps existing deployment parameters', async () => {
    console.warn = jest.fn()
    const classifier = { id: 5, name: 'chainsaw', version: 1, created_by_id: seedValues.otherUserId, model_runner: 'tf2', model_url: '' }
    const deployment = { classifier_id: classifier.id, deployment_parameters: 'hello=world', status: 20, start: new Date(), created_by_id: seedValues.otherUserId }
    await models.Classifier.create(classifier)
    await models.ClassifierDeployment.create(deployment)
    const requestBody = { status: 30 }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(200)
    const deployments = await models.ClassifierDeployment.findAll({ order: ['status'] })
    const newDeployment = deployments.find(d => d.status === 30)
    expect(newDeployment.deployment_parameters).toBe(deployment.deployment_parameters)
  })

  test('update classifier with empty deployment parameters', async () => {
    console.warn = jest.fn()
    const classifier = { id: 5, name: 'chainsaw', version: 1, created_by_id: seedValues.otherUserId, model_runner: 'tf2', model_url: '' }
    const deployment = { classifier_id: classifier.id, deployment_parameters: 'hello=world', status: 20, start: new Date(), created_by_id: seedValues.otherUserId }
    await models.Classifier.create(classifier)
    await models.ClassifierDeployment.create(deployment)
    const requestBody = { status: 30, deployment_parameters: '' }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(200)
    const deployments = await models.ClassifierDeployment.findAll({ order: ['status'] })
    const newDeployment = deployments.find(d => d.status === 30)
    expect(newDeployment.deployment_parameters).toBeNull()
  })
})

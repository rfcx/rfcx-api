const request = require('supertest')
const routes = require('.')
const models = require('../_models')
const { expressApp, seedValues, truncateNonBase } = require('../../common/testing/sequelize')

const app = expressApp({ has_system_role: true })

app.use('/', routes)

const CLASSIFICATION_1 = { id: 1, value: 'chainsaw', title: 'chainsaw', typeId: 1, sourceId: null, parent_id: null, source_external_id: null, created_at: '2022-06-29 11:22:37.094935' }
const CLASSIFICATION_2 = { id: 2, value: 'vehicle', title: 'vehicle', typeId: 1, sourceId: null, parent_id: null, source_external_id: null, created_at: '2022-06-29 11:22:37.094935' }
const CLASSIFICATION_3 = { id: 3, value: 'gunshot', title: 'gunshot', typeId: 1, sourceId: null, parent_id: null, source_external_id: null, created_at: '2022-06-29 11:22:37.094935' }
const CLASSIFICATION_4 = { id: 4, value: 'human', title: 'human', typeId: 1, sourceId: null, parent_id: null, source_external_id: null, created_at: '2022-06-29 11:22:37.094935' }
const CLASSIFICATIONS = [CLASSIFICATION_1, CLASSIFICATION_2, CLASSIFICATION_3, CLASSIFICATION_4]

const classifier = { id: 5, name: 'chainsaw', version: 1, createdById: seedValues.otherUserId, parameters: 'step=0.9', modelRunner: 'tf2', modelUrl: 's3://test/xyz.tar.gz' }
const deployment = { classifierId: classifier.id, status: 20, start: new Date(), createdById: seedValues.otherUserId }
const classifierOutput1 = { classifierId: classifier.id, classificationId: CLASSIFICATION_1.id, outputClassName: 'chainsaw' }
const classifierOutput2 = { classifierId: classifier.id, classificationId: CLASSIFICATION_2.id, outputClassName: 'vehicle' }
const classifierOutput3 = { classifierId: classifier.id, classificationId: CLASSIFICATION_3.id, outputClassName: 'gunshot' }

async function commonSetup () {
  await models.Classification.bulkCreate(CLASSIFICATIONS)
  await models.Classifier.create(classifier)
  await models.ClassifierDeployment.create(deployment)
  await models.ClassifierOutput.create(classifierOutput1)
  await models.ClassifierOutput.create(classifierOutput2)
  await models.ClassifierOutput.create(classifierOutput3)
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
    console.info(response)

    expect(response.statusCode).toBe(403)
    expect(console.warn).toHaveBeenCalled()
  })

  test('super user can update any classifier', async () => {
    const superUserApp = expressApp({ is_super: true })
    superUserApp.use('/', routes)
    console.warn = jest.fn()
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
    const requestBody = { modelUrl: 's3://new-test/abc.tar.gz' }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(200)
    const deployments = await models.ClassifierDeployment.findAll({ where: { classifierId: classifier.id } })
    expect(deployments).toHaveLength(1)
  })

  test('update classifier with empty status', async () => {
    console.warn = jest.fn()
    const requestBody = { status: '', modelUrl: 's3://new-test/abc.tar.gz' }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(400)
  })

  test('update classifier with new url and status', async () => {
    console.warn = jest.fn()
    const requestBody = { status: 30, modelUrl: 's3://new-test/abc.tar.gz' }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(200)
    const deployments = await models.ClassifierDeployment.findAll({ order: ['status'] })
    const newDeployment = deployments.find(d => d.status === 30)
    expect(newDeployment).toBeDefined()
  })

  test('update classifier with new parameters', async () => {
    console.warn = jest.fn()
    const requestBody = { parameters: 'step=0.8' }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(200)
    const updatedClassifier = await models.Classifier.findByPk(classifier.id)
    expect(updatedClassifier.parameters).toBe(requestBody.parameters)
  })

  test('update active streams', async () => {
    console.warn = jest.fn()
    const stream = { id: 'bar-xyz-1234', name: 'test', isPublic: true, createdById: seedValues.otherUserId }
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
    const project = { id: 'bar-xyz-1234', name: 'test', isPublic: true, createdById: seedValues.otherUserId }
    await models.Project.create(project)
    const requestBody = { active_projects: 'bar-xyz-1234' }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(200)
    const activeProjects = await models.ClassifierActiveProject.findAll()
    expect(activeProjects.length).toBe(1)
    const classifierActiveProject = activeProjects.find(s => s.classifierId === classifier.id)
    expect(classifierActiveProject.projectId).toBe(requestBody.active_projects)
  })

  test('update classifier with classification_values to:threshold', async () => {
    console.warn = jest.fn()
    const requestBody = { classification_values: 'chainsaw:0.1' }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(200)
    const output = await models.ClassifierOutput.findAll({ where: { classifierId: classifier.id, classificationId: CLASSIFICATION_1.id, outputClassName: classifierOutput1.outputClassName } })
    expect(output[0].ignoreThreshold).toBe(0.1)
  })

  test('update classifier with classification_values from:to:threshold', async () => {
    console.warn = jest.fn()
    const requestBody = { classification_values: 'chainsaw:chainsaw:0.1' }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(200)
    const output = await models.ClassifierOutput.findAll({ where: { classifierId: classifier.id, classificationId: CLASSIFICATION_1.id, outputClassName: classifierOutput1.outputClassName } })
    expect(output[0].ignoreThreshold).toBe(0.1)
  })

  test('update classifier with classification_values from:to:threshold with 1 class changed', async () => {
    console.warn = jest.fn()
    const requestBody = { classification_values: 'chainsaw:chainsaw:0.1' }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(200)
    const output = await models.ClassifierOutput.findAll({ where: { classifierId: classifier.id } })
    expect(output.length).toBe(3)
    expect(output[0].ignoreThreshold).toBe(0.1)
    expect(output[1].ignoreThreshold).toBe(0.5)
    expect(output[2].ignoreThreshold).toBe(0.5)
  })

  test('update classifier with classification_values from:to:threshold with 2 class changed', async () => {
    console.warn = jest.fn()
    const requestBody = { classification_values: ['chainsaw:chainsaw:0.1', 'vehicle:vehicle:0.2'] }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(200)
    const output = await models.ClassifierOutput.findAll({ where: { classifierId: classifier.id } })
    expect(output.length).toBe(3)
    expect(output[0].ignoreThreshold).toBe(0.1)
    expect(output[1].ignoreThreshold).toBe(0.2)
    expect(output[2].ignoreThreshold).toBe(0.5)
  })

  test('update classifier with classification_values from:to:threshold with 3 class changed', async () => {
    console.warn = jest.fn()
    const requestBody = { classification_values: ['chainsaw:chainsaw:0.1', 'vehicle:vehicle:0.2', 'gunshot:gunshot:0.3'] }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(200)
    const output = await models.ClassifierOutput.findAll({ where: { classifierId: classifier.id } })
    expect(output.length).toBe(3)
    expect(output[0].ignoreThreshold).toBe(0.1)
    expect(output[1].ignoreThreshold).toBe(0.2)
    expect(output[2].ignoreThreshold).toBe(0.3)
  })

  test('update classifier with classification_values from:to:threshold with threshold 2 decimal places', async () => {
    console.warn = jest.fn()
    const requestBody = { classification_values: 'chainsaw:chainsaw:0.77' }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(200)
    const output = await models.ClassifierOutput.findAll({ where: { classifierId: classifier.id, classificationId: CLASSIFICATION_1.id, outputClassName: classifierOutput1.outputClassName } })
    expect(output[0].ignoreThreshold).toBe(0.77)
  })

  test('update classifier with classification_values from:to', async () => {
    console.warn = jest.fn()
    const requestBody = { classification_values: 'chainsaw:chainsaw' }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(200)
    const output = await models.ClassifierOutput.findAll({ where: { classifierId: classifier.id, classificationId: CLASSIFICATION_1.id, outputClassName: classifierOutput1.outputClassName } })
    expect(output[0].ignoreThreshold).toBe(0.5)
  })

  test('update classifier with classification_values only (to)', async () => {
    console.warn = jest.fn()
    const requestBody = { classification_values: 'chainsaw' }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(200)
    const output = await models.ClassifierOutput.findAll({ where: { classifierId: classifier.id, classificationId: CLASSIFICATION_1.id, outputClassName: classifierOutput1.outputClassName } })
    expect(output[0].ignoreThreshold).toBe(0.5)
  })

  test('failed update classifier with classification_values to:threshold but to is not exist', async () => {
    console.warn = jest.fn()
    const toName = 'chns'
    const requestBody = { classification_values: `${toName}:0.1` }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(404)
    expect(response.body.message).toBe(`Classification "${toName}" does not exist`)
  })

  test('failed update classifier with classification_values to:threshold existing (to) classification but does not exist for classifier', async () => {
    console.warn = jest.fn()
    const toName = 'human'
    const requestBody = { classification_values: `${toName}:0.1` }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(404)
    expect(response.body.message).toBe(`Classification "${toName}" or Class name "${toName}" does not exist for this classifier`)
  })

  test('failed update classifier with classification_values only to but not exist', async () => {
    console.warn = jest.fn()
    const toName = 'chns'
    const requestBody = { classification_values: toName }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(404)
    expect(response.body.message).toBe(`Classification "${toName}" does not exist`)
  })

  test('failed update classifier with classification_values only existing (to) classification but does not exist for classifier', async () => {
    console.warn = jest.fn()
    const toName = 'human'
    const requestBody = { classification_values: toName }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(404)
    expect(response.body.message).toBe(`Classification "${toName}" or Class name "${toName}" does not exist for this classifier`)
  })

  test('failed update classifier with classification_values from:to: but (from) is not exist', async () => {
    console.warn = jest.fn()
    const toName = 'chainsaw'
    const fromName = 'chns'
    const requestBody = { classification_values: `${fromName}:${toName}` }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(404)
    expect(response.body.message).toBe(`Classification "${toName}" or Class name "${fromName}" does not exist for this classifier`)
  })

  test('failed update classifier with classification_values from:to but (to) is not exist', async () => {
    console.warn = jest.fn()
    const toName = 'chns'
    const fromName = 'chainsaw'
    const requestBody = { classification_values: `${fromName}:${toName}` }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(404)
    expect(response.body.message).toBe(`Classification "${toName}" does not exist`)
  })

  test('failed update classifier with classification_values from:to existing (to) classification but does not exist for classifier', async () => {
    console.warn = jest.fn()
    const toName = 'chainsaw'
    const fromName = 'gunshot'
    const requestBody = { classification_values: `${fromName}:${toName}` }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(404)
    expect(response.body.message).toBe(`Classification "${toName}" or Class name "${fromName}" does not exist for this classifier`)
  })

  test('failed update classifier with classification_values from:to:threshold but (from) is not exist', async () => {
    console.warn = jest.fn()
    const toName = 'chainsaw'
    const fromName = 'chns'
    const requestBody = { classification_values: `${fromName}:${toName}:0.1` }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(404)
    expect(response.body.message).toBe(`Classification "${toName}" or Class name "${fromName}" does not exist for this classifier`)
  })

  test('failed update classifier with classification_values from:to:threshold existing (to) classification but does not exist for classifier', async () => {
    console.warn = jest.fn()
    const toName = 'chainsaw'
    const fromName = 'gunshot'
    const requestBody = { classification_values: `gunshot:${toName}:0.1` }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(404)
    expect(response.body.message).toBe(`Classification "${toName}" or Class name "${fromName}" does not exist for this classifier`)
  })

  test('failed update classifier with classification_values from:to:threshold 1 of them does not exist for this classifier', async () => {
    console.warn = jest.fn()
    const toName = 'human'
    const fromName = 'human'
    const requestBody = { classification_values: ['chainsaw:chainsaw:0.1', 'vehicle:vehicle:0.2', `${toName}:${fromName}:0.3`] }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(404)
    const output = await models.ClassifierOutput.findAll({ where: { classifierId: classifier.id } })
    expect(response.body.message).toBe(`Classification "${toName}" or Class name "${fromName}" does not exist for this classifier`)
    expect(output.length).toBe(3)
    expect(output[0].ignoreThreshold).toBe(0.5)
    expect(output[1].ignoreThreshold).toBe(0.5)
    expect(output[2].ignoreThreshold).toBe(0.5)
  })

  test('failed update classifier with classification_values from:to:threshold 1 of them does not exist in classification table', async () => {
    console.warn = jest.fn()
    const toName = 'abc'
    const fromName = 'def'
    const requestBody = { classification_values: ['chainsaw:chainsaw:0.1', `${toName}:${fromName}:0.2`, 'vehicle:vehicle:0.3'] }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(404)
    const output = await models.ClassifierOutput.findAll({ where: { classifierId: classifier.id } })
    expect(response.body.message).toBe(`Classification "${fromName}" does not exist`)
    expect(output.length).toBe(3)
    expect(output[0].ignoreThreshold).toBe(0.5)
    expect(output[1].ignoreThreshold).toBe(0.5)
    expect(output[2].ignoreThreshold).toBe(0.5)
  })

  test('failed update classifier with classification_values only threshold', async () => {
    console.warn = jest.fn()
    const requestBody = { classification_values: '0.1' }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(400)
    expect(response.body.message).toBe('classification_values is invalid format')
  })

  test('failed update classifier with classification_values invalid format (abc)', async () => {
    console.warn = jest.fn()
    const requestBody = { classification_values: 'chainsaw:chainsaw:abc' }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(400)
    expect(response.body.message).toBe('classification_values is invalid format')
  })

  test('failed update classifier with classification_values invalid format (> 1.0)', async () => {
    console.warn = jest.fn()
    const requestBody = { classification_values: 'chainsaw:chainsaw:1.5' }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(400)
    expect(response.body.message).toBe('classification_values is invalid format')
  })

  test('failed update classifier with classification_values invalid format (< 0.0)', async () => {
    console.warn = jest.fn()
    const requestBody = { classification_values: 'chainsaw:chainsaw:-0.1' }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(400)
    expect(response.body.message).toBe('classification_values is invalid format')
  })

  test('failed update classifier with classification_values invalid format (decimal place > 2 but still in range)', async () => {
    console.warn = jest.fn()
    const requestBody = { classification_values: 'chainsaw:chainsaw:0.123' }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(400)
    expect(response.body.message).toBe('classification_values is invalid format')
  })

  test('failed update classifier with classification_values invalid format (decimal place > 2 and out of range)', async () => {
    console.warn = jest.fn()
    const requestBody = { classification_values: 'chainsaw:chainsaw:1.003' }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(400)
    expect(response.body.message).toBe('classification_values is invalid format')
  })

  test('failed update classifier with classification_values invalid format (max range but decimal place > 2)', async () => {
    console.warn = jest.fn()
    const requestBody = { classification_values: 'chainsaw:chainsaw:1.000' }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(400)
    expect(response.body.message).toBe('classification_values is invalid format')
  })

  test('failed update classifier with classification_values invalid format (many colons)', async () => {
    console.warn = jest.fn()
    const requestBody = { classification_values: 'chainsaw:chainsaw:1.00:1.00:chainsaw' }

    const response = await request(app).patch(`/${classifier.id}`).send(requestBody)

    expect(response.statusCode).toBe(400)
    expect(response.body.message).toBe('classification_values is invalid format')
  })
})

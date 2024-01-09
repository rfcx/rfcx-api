const request = require('supertest')
const routes = require('./classifier-deployments')
const models = require('../../_models')
const { expressApp, seedValues, truncateNonBase, muteConsole } = require('../../../common/testing/sequelize')

const app = expressApp({ has_system_role: true })

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
  const classification = (await models.Classification.findOrCreate({ where: { value: 'chainsaw', title: 'Chainsaw', typeId: 1, sourceId: 1 } }))[0]
  const classifier = (await models.Classifier.findOrCreate({ where: { externalId: 'cccddd', name: 'chainsaw model', version: 1, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: 's3://something' } }))[0]
  const classifierOutput = await models.ClassifierOutput.create({ classifierId: classifier.id, classificationId: classification.id, outputClassName: 'chnsw', ignoreThreshold: 0.1 })
  const classifierDeployment = await models.ClassifierDeployment.create({ classifierId: classifier.id, status: 20, start: new Date(), createdById: seedValues.otherUserId })
  return { classification, classifier, classifierOutput, classifierDeployment }
}

describe('PATCH /internal/prediction/classifier-deployments', () => {
  test('success set deployed', async () => {
    const { classifierDeployment } = await commonSetup()
    const requestBody = {
      deployed: true
    }

    const response = await request(app).patch(`/classifier-deployments/${classifierDeployment.id}`).send(requestBody)
    const deployment = await models.ClassifierDeployment.findByPk(classifierDeployment.id)

    expect(response.statusCode).toBe(200)
    expect(deployment.deployed).toBe(true)
  })

  test('success set deployed and threshold', async () => {
    const { classifierOutput, classifierDeployment } = await commonSetup()
    const requestBody = {
      deployed: true,
      ignore_threshold: 0.9
    }

    const response = await request(app).patch(`/classifier-deployments/${classifierDeployment.id}`).send(requestBody)
    const deployment = await models.ClassifierDeployment.findByPk(classifierDeployment.id)
    const outout = await models.ClassifierOutput.findByPk(classifierOutput.id)

    expect(response.statusCode).toBe(200)
    expect(deployment.deployed).toBe(true)
    expect(outout.ignoreThreshold).toBe(0.9)
  })

  test('failed classifier-deployment not found', async () => {
    commonSetup()
    const requestBody = {
      deployed: true,
      ignore_threshold: 0.9
    }

    const response = await request(app).patch('/classifier-deployments/123456').send(requestBody)

    expect(response.statusCode).toBe(404)
  })

  test('failed classifier-output not found to update', async () => {
    commonSetup()
    const classifier = (await models.Classifier.findOrCreate({ where: { externalId: 'ffffggg', name: 'chainsaw model 2', version: 1, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: 's3://something' } }))[0]
    const classifierDeployment = await models.ClassifierDeployment.create({ classifierId: classifier.id, status: 20, start: new Date(), createdById: seedValues.otherUserId })
    const requestBody = {
      deployed: true,
      ignore_threshold: 0.9
    }

    const response = await request(app).patch(`/classifier-deployments/${classifierDeployment.id}`).send(requestBody)

    expect(response.statusCode).toBe(404)
  })
})

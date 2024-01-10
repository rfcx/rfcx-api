const request = require('supertest')
const routes = require('.')
const models = require('../_models')
const { expressApp, truncateNonBase, muteConsole } = require('../../common/testing/sequelize')

const app = expressApp({ has_system_role: true })

app.use('/', routes)

const CLASSIFICATION_1 = { id: 1, value: 'chainsaw', title: 'chainsaw', typeId: 1, sourceId: null, parent_id: null, source_external_id: null, created_at: '2022-06-29 11:22:37.094935' }
const CLASSIFICATION_2 = { id: 2, value: 'vehicle', title: 'vehicle', typeId: 1, sourceId: null, parent_id: null, source_external_id: null, created_at: '2022-06-29 11:22:37.094935' }
const CLASSIFICATIONS = [CLASSIFICATION_1, CLASSIFICATION_2]

async function commonSetup () {
  await models.Classification.bulkCreate(CLASSIFICATIONS)
}

beforeAll(async () => {
  muteConsole('warn')
})
beforeEach(async () => {
  await commonSetup()
})
afterEach(async () => {
  await truncateNonBase(models)
})
afterAll(async () => {
  await models.sequelize.close()
})

describe('POST /classifiers/:id', () => {
  const superUserApp = expressApp({ is_super: true })
  superUserApp.use('/', routes)

  const requestBody = {
    name: 'chainsaw',
    version: 1,
    parameters: 'step=0.9',
    classification_values: 'chainsaw'
  }

  describe('valid usage', () => {
    test('super user can create classifier', async () => {
      // Act
      const response = await request(superUserApp).post('/').send(requestBody)
      const classifiers = await models.Classifier.findAll()
      const classifierOutputs = await models.ClassifierOutput.findAll()

      // Assert
      expect(response.statusCode).toBe(201)
      expect(classifiers.length).toBe(1)
      expect(response.headers.location).toContain(`/${classifiers[0].id}`)
      expect(classifiers[0].name).toBe(requestBody.name)
      expect(classifiers[0].version).toBe(requestBody.version)
      expect(classifiers[0].parameters).toBe(requestBody.parameters)
      expect(classifierOutputs.length).toBe(1)
      expect(classifierOutputs[0].classifierId).toBe(classifiers[0].id)
      expect(classifierOutputs[0].classificationId).toBe(CLASSIFICATION_1.id)
      expect(classifierOutputs[0].outputClassName).toBe(CLASSIFICATION_1.value)
      expect(classifierOutputs[0].ignoreThreshold).toBe(0.5)
    })

    test('normal user can create classifier', async () => {
      // Arrange
      const regularUserApp = expressApp({ is_super: false })
      regularUserApp.use('/', routes)

      // Act
      const response = await request(regularUserApp).post('/').send(requestBody)

      // Assert
      expect(response.statusCode).toBe(201)
    })

    test('map from:to correct classification value', async () => {
      // Arrange
      const classifierLabel = 'chain'
      const dbLabel = CLASSIFICATION_1.value
      const requestBody = {
        name: 'chainsaw',
        version: 1,
        classification_values: `${classifierLabel}:${dbLabel}`
      }

      // Act
      const response = await request(superUserApp).post('/').send(requestBody)
      const classifierOutputs = await models.ClassifierOutput.findAll()

      // Assert
      expect(response.statusCode).toBe(201)
      expect(classifierOutputs.length).toBe(1)
      expect(classifierOutputs[0].classificationId).toBe(CLASSIFICATION_1.id)
      expect(classifierOutputs[0].outputClassName).toBe(classifierLabel)
      expect(classifierOutputs[0].ignoreThreshold).toBe(0.5)
    })

    test('map from:to:threshold correct classification value and correct threshold', async () => {
      // Arrange
      const classifierLabel = 'chain'
      const dbLabel = CLASSIFICATION_1.value
      const threshold = 0.2
      const requestBody = {
        name: 'chainsaw',
        version: 1,
        classification_values: `${classifierLabel}:${dbLabel}:${threshold}`
      }

      // Act
      const response = await request(superUserApp).post('/').send(requestBody)
      const classifierOutputs = await models.ClassifierOutput.findAll()

      // Assert
      expect(response.statusCode).toBe(201)
      expect(classifierOutputs.length).toBe(1)
      expect(classifierOutputs[0].classificationId).toBe(CLASSIFICATION_1.id)
      expect(classifierOutputs[0].outputClassName).toBe(classifierLabel)
      expect(classifierOutputs[0].ignoreThreshold).toBe(threshold)
    })

    test('map to:threshold correct classification value and correct threshold', async () => {
      // Arrange
      const dbLabel = CLASSIFICATION_1.value
      const threshold = 0.2
      const requestBody = {
        name: 'chainsaw',
        version: 1,
        classification_values: `${dbLabel}:${threshold}`
      }

      // Act
      const response = await request(superUserApp).post('/').send(requestBody)
      const classifierOutputs = await models.ClassifierOutput.findAll()

      // Assert
      expect(response.statusCode).toBe(201)
      expect(classifierOutputs.length).toBe(1)
      expect(classifierOutputs[0].classificationId).toBe(CLASSIFICATION_1.id)
      expect(classifierOutputs[0].outputClassName).toBe(dbLabel)
      expect(classifierOutputs[0].ignoreThreshold).toBe(threshold)
    })

    test('multiple from:to classification values', async () => {
      // Arrange
      const classifierLabel1 = 'chain'
      const classifierLabel2 = 'veh'
      const dbLabel1 = CLASSIFICATION_1.value
      const dbLabel2 = CLASSIFICATION_2.value
      const requestBody = {
        name: 'chainsaw_and_vehicle',
        version: 1,
        classification_values: [`${classifierLabel1}:${dbLabel1}`, `${classifierLabel2}:${dbLabel2}`]
      }

      // Act
      const response = await request(superUserApp).post('/').send(requestBody)
      const classifierOutputs = await models.ClassifierOutput.findAll()

      // Assert
      expect(response.statusCode).toBe(201)
      expect(classifierOutputs.length).toBe(2)
      expect(classifierOutputs[0].classificationId).toBe(CLASSIFICATION_1.id)
      expect(classifierOutputs[0].outputClassName).toBe(classifierLabel1)
      expect(classifierOutputs[0].ignoreThreshold).toBe(0.5)
      expect(classifierOutputs[1].classificationId).toBe(CLASSIFICATION_2.id)
      expect(classifierOutputs[1].outputClassName).toBe(classifierLabel2)
      expect(classifierOutputs[1].ignoreThreshold).toBe(0.5)
    })

    test('multiple from:to:threshold classification values', async () => {
      // Arrange
      const classifierLabel1 = 'chain'
      const classifierLabel2 = 'veh'
      const dbLabel1 = CLASSIFICATION_1.value
      const dbLabel2 = CLASSIFICATION_2.value
      const threshold1 = 0.1
      const threshold2 = 0.2
      const requestBody = {
        name: 'chainsaw_and_vehicle',
        version: 1,
        classification_values: [`${classifierLabel1}:${dbLabel1}:${threshold1}`, `${classifierLabel2}:${dbLabel2}:${threshold2}`]
      }

      // Act
      const response = await request(superUserApp).post('/').send(requestBody)
      const classifierOutputs = await models.ClassifierOutput.findAll()

      // Assert
      expect(response.statusCode).toBe(201)
      expect(classifierOutputs.length).toBe(2)
      expect(classifierOutputs[0].classificationId).toBe(CLASSIFICATION_1.id)
      expect(classifierOutputs[0].outputClassName).toBe(classifierLabel1)
      expect(classifierOutputs[0].ignoreThreshold).toBe(threshold1)
      expect(classifierOutputs[1].classificationId).toBe(CLASSIFICATION_2.id)
      expect(classifierOutputs[1].outputClassName).toBe(classifierLabel2)
      expect(classifierOutputs[1].ignoreThreshold).toBe(threshold2)
    })

    test('multiple to:threshold classification values', async () => {
      // Arrange
      const dbLabel1 = CLASSIFICATION_1.value
      const dbLabel2 = CLASSIFICATION_2.value
      const threshold1 = 0.1
      const threshold2 = 0.2
      const requestBody = {
        name: 'chainsaw_and_vehicle',
        version: 1,
        classification_values: [`${dbLabel1}:${threshold1}`, `${dbLabel2}:${threshold2}`]
      }

      // Act
      const response = await request(superUserApp).post('/').send(requestBody)
      const classifierOutputs = await models.ClassifierOutput.findAll()

      // Assert
      expect(response.statusCode).toBe(201)
      expect(classifierOutputs.length).toBe(2)
      expect(classifierOutputs[0].classificationId).toBe(CLASSIFICATION_1.id)
      expect(classifierOutputs[0].outputClassName).toBe(dbLabel1)
      expect(classifierOutputs[0].ignoreThreshold).toBe(threshold1)
      expect(classifierOutputs[1].classificationId).toBe(CLASSIFICATION_2.id)
      expect(classifierOutputs[1].outputClassName).toBe(dbLabel2)
      expect(classifierOutputs[1].ignoreThreshold).toBe(threshold2)
    })

    test('multiple only to classification values', async () => {
      // Arrange
      const dbLabel1 = CLASSIFICATION_1.value
      const dbLabel2 = CLASSIFICATION_2.value
      const requestBody = {
        name: 'chainsaw_and_vehicle',
        version: 1,
        classification_values: [`${dbLabel1}`, `${dbLabel2}`]
      }

      // Act
      const response = await request(superUserApp).post('/').send(requestBody)
      const classifierOutputs = await models.ClassifierOutput.findAll()

      // Assert
      expect(response.statusCode).toBe(201)
      expect(classifierOutputs.length).toBe(2)
      expect(classifierOutputs[0].classificationId).toBe(CLASSIFICATION_1.id)
      expect(classifierOutputs[0].outputClassName).toBe(dbLabel1)
      expect(classifierOutputs[0].ignoreThreshold).toBe(0.5)
      expect(classifierOutputs[1].classificationId).toBe(CLASSIFICATION_2.id)
      expect(classifierOutputs[1].outputClassName).toBe(dbLabel2)
      expect(classifierOutputs[1].ignoreThreshold).toBe(0.5)
    })
  })

  describe('invalid usage', () => {
    test('400 if not classification not exist in db', async () => {
      // Arrange
      const requestBody = {
        name: 'abc',
        version: 1,
        classification_values: 'abc'
      }

      // Act
      const response = await request(superUserApp).post('/').send(requestBody)
      const classifiers = await models.Classifier.findAll()
      const classifierOutputs = await models.ClassifierOutput.findAll()

      // Assert
      expect(response.statusCode).toBe(400)
      expect(classifiers.length).toBe(0)
      expect(classifierOutputs.length).toBe(0)
    })

    test('400 to:threshold if not classification not exist in db', async () => {
      // Arrange
      const requestBody = {
        name: 'abc',
        version: 1,
        classification_values: 'abc:0.5'
      }

      // Act
      const response = await request(superUserApp).post('/').send(requestBody)
      const classifiers = await models.Classifier.findAll()
      const classifierOutputs = await models.ClassifierOutput.findAll()

      // Assert
      expect(response.statusCode).toBe(400)
      expect(classifiers.length).toBe(0)
      expect(classifierOutputs.length).toBe(0)
    })

    test('400 from:to if not classification not exist in db', async () => {
      // Arrange
      const requestBody = {
        name: 'abc',
        version: 1,
        classification_values: 'abc:def'
      }

      // Act
      const response = await request(superUserApp).post('/').send(requestBody)
      const classifiers = await models.Classifier.findAll()
      const classifierOutputs = await models.ClassifierOutput.findAll()

      // Assert
      expect(response.statusCode).toBe(400)
      expect(classifiers.length).toBe(0)
      expect(classifierOutputs.length).toBe(0)
    })

    test('400 from:to:threshold if not classification not exist in db', async () => {
      // Arrange
      const requestBody = {
        name: 'abc',
        version: 1,
        classification_values: 'abc:def:0.5'
      }

      // Act
      const response = await request(superUserApp).post('/').send(requestBody)
      const classifiers = await models.Classifier.findAll()
      const classifierOutputs = await models.ClassifierOutput.findAll()

      // Assert
      expect(response.statusCode).toBe(400)
      expect(classifiers.length).toBe(0)
      expect(classifierOutputs.length).toBe(0)
    })

    test('400 only threshold in classification values', async () => {
      // Arrange
      const requestBody = {
        name: 'abc',
        version: 1,
        classification_values: '0.5'
      }

      // Act
      const response = await request(superUserApp).post('/').send(requestBody)
      const classifiers = await models.Classifier.findAll()
      const classifierOutputs = await models.ClassifierOutput.findAll()

      // Assert
      expect(response.statusCode).toBe(400)
      expect(classifiers.length).toBe(0)
      expect(classifierOutputs.length).toBe(0)
    })

    test('400 from:to:threshold but threshold is invalid format', async () => {
      // Arrange
      const requestBody = {
        name: 'abc',
        version: 1,
        classification_values: 'chainsaw:chainsaw:abc'
      }

      // Act
      const response = await request(superUserApp).post('/').send(requestBody)
      const classifiers = await models.Classifier.findAll()
      const classifierOutputs = await models.ClassifierOutput.findAll()

      // Assert
      expect(response.statusCode).toBe(400)
      expect(classifiers.length).toBe(0)
      expect(classifierOutputs.length).toBe(0)
    })
  })
})

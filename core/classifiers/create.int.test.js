const request = require('supertest')
const routes = require('.')
const models = require('../_models')
const { expressApp, truncateNonBase } = require('../../common/testing/sequelize')

const app = expressApp({ has_system_role: true })

app.use('/', routes)

const CLASSIFICATION_1 = { id: 1, value: 'chainsaw', title: 'chainsaw', type_id: 1, source_id: null, parent_id: null, source_external_id: null, created_at: '2022-06-29 11:22:37.094935', update_at: '2022-06-29 11:22:37.094935' }
const CLASSIFICATION_2 = { id: 2, value: 'vehicle', title: 'vehicle', type_id: 1, source_id: null, parent_id: null, source_external_id: null, created_at: '2022-06-29 11:22:37.094935', update_at: '2022-06-29 11:22:37.094935' }

async function commonSetup () {
  await models.Classification.bulkCreate([CLASSIFICATION_1, CLASSIFICATION_2])
}

beforeEach(async () => {
  await commonSetup()
})
afterEach(async () => {
  await truncateNonBase(models)
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
    test('normal user is forbidden', async () => {
      const regularUserApp = expressApp({ is_super: false })
      regularUserApp.use('/', routes)
      console.warn = jest.fn()

      const response = await request(regularUserApp).post('/').send(requestBody)

      expect(response.statusCode).toBe(403)
      expect(console.warn).toHaveBeenCalled()
    })
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
    })

    test('map correct classification value', async () => {
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
    })

    test('multiple classification values', async () => {
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
      expect(classifierOutputs[1].classificationId).toBe(CLASSIFICATION_2.id)
      expect(classifierOutputs[1].outputClassName).toBe(classifierLabel2)
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
  })
})

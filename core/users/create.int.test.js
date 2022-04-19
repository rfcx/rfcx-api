const models = require('../_models')
const { migrate, truncate, expressApp, seed, seedValues } = require('../../common/testing/sequelize')
const request = require('supertest')
const router = require('express').Router()

const app = expressApp({ has_system_role: true })
router.post('/', require('./create'))
app.use('/', router)

beforeAll(async () => {
  await migrate(models.sequelize, models.Sequelize)
  await seed(models)
})
beforeEach(async () => {
  await truncate(models)
})

describe('POST /users', () => {

})

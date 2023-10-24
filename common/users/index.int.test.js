const models = require('../../core/_models')
const { truncateNonBase } = require('../testing/sequelize')
const { findOrCreateUser } = require('./index')

const data = { email: 'curious@cat.com', guid: 'ba2d84f2-e9af-495b-943e-f4534722be6f' }
const dataUpper = { email: 'Curious@cat.com', guid: 'ba2d84f2-e9af-495b-943e-f4534722be6e' }

afterEach(async () => {
  await truncateNonBase(models)
  await models.User.destroy({ where: data })
  await models.User.destroy({ where: dataUpper })
})

afterAll(async () => {
  await models.sequelize.close()
})

describe('user service -> findOrCreateUser', () => {
  test('creates new user with data', async () => {
    const usersBefore = await models.User.findAll({ where: data })
    expect(usersBefore.length).toBe(0)
    const result = await findOrCreateUser(data)
    const usersAfter = await models.User.findAll({ where: data })
    expect(usersAfter.length).toBe(1)
    expect(result[0].guid).toBe(data.guid)
    expect(result[0].email).toBe(data.email)
  })
  test('returns existing user with the same guid and email', async () => {
    await models.User.create(data)
    const usersBefore = await models.User.findAll({ where: data })
    expect(usersBefore.length).toBe(1)
    const result = await findOrCreateUser(data)
    const usersAfter = await models.User.findAll({ where: data })
    expect(usersAfter.length).toBe(1)
    expect(result[0].guid).toBe(data.guid)
    expect(result[0].email).toBe(data.email)
  })
  test('returns existing user with the same guid and different email', async () => {
    await models.User.create(data)
    const newData = { ...data, email: 'small@fox.com' }
    const usersBefore = await models.User.findAll({ where: { email: newData.email } })
    expect(usersBefore.length).toBe(0)
    const result = await findOrCreateUser(newData)
    const usersAfter = await models.User.findAll({ where: { email: newData.email } })
    expect(usersAfter.length).toBe(0)
    expect(result[0].guid).toBe(data.guid)
    expect(result[0].email).toBe(data.email)
  })
  test('returns existing user with the same email and different guid', async () => {
    await models.User.create(data)
    const newData = { ...data, guid: 'ba2d84f2-e9af-495b-943e-f4534722be6e' }
    const usersBefore = await models.User.findAll({ where: { email: newData.guid } })
    expect(usersBefore.length).toBe(0)
    const result = await findOrCreateUser(newData)
    const usersAfter = await models.User.findAll({ where: { email: newData.guid } })
    expect(usersAfter.length).toBe(0)
    expect(result[0].guid).toBe(data.guid)
    expect(result[0].email).toBe(data.email)
  })
  test('does not create new user if email exists but new one is uppercased', async () => {
    await models.User.create(data)
    const usersBefore = await models.User.findAll({ where: dataUpper })
    expect(usersBefore.length).toBe(0)
    const result = await findOrCreateUser(dataUpper)
    const usersAfter = await models.User.findAll({ where: dataUpper })
    expect(usersAfter.length).toBe(0)
    expect(result[0].guid).toBe(data.guid)
    expect(result[0].email).toBe(data.email)
  })
})

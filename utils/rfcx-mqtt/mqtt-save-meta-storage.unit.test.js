const moment = require('moment')
const { saveMeta: { Storage } } = require('./mqtt-save-meta')
const models = require('../../models')

jest.mock('../../models', () => {
  const storage = []
  return {
    GuardianMetaDiskUsage: {
      findAll: () => Promise.resolve(storage),
      bulkCreate: (objects) => {
        storage.push(...objects)
        return Promise.resolve()
      }
    },
    reset: () => {
      while (storage.length) {
        storage.pop()
      }
    }
  }
})

beforeEach(async () => {
  await models.reset()
})

test('normal storage', async () => {
  const payloadAsArray = [
    ['internal', '1639662807198', '287502336', '1077907456'],
    ['external', '1639662807198', '396197888', '127436980224'],
    ['internal', '1639662257985', '287502336', '1077907456'],
    ['external', '1639662257985', '396197888', '127436980224']]

  await Storage(payloadAsArray, 'xyz', '123')

  const results = await models.GuardianMetaDiskUsage.findAll()

  expect(results.length).toBe(1)
  expect(results[0].measured_at).toEqual(moment(parseInt(payloadAsArray[2][1])).toDate())
  expect(results[0].internal_bytes_available).toBe(parseInt(payloadAsArray[2][3]))
  expect(results[0].internal_bytes_used).toBe(parseInt(payloadAsArray[2][2]))
  expect(results[0].external_bytes_available).toBe(parseInt(payloadAsArray[3][3]))
  expect(results[0].external_bytes_used).toBe(parseInt(payloadAsArray[3][2]))
})

test('shorten storage', async () => {
  const payloadAsArray = [
    ['i', '1639662807198', '287502336', '1077907456'],
    ['e', '1639662807198', '396197888', '127436980224'],
    ['i', '1639662257985', '287502336', '1077907456'],
    ['e', '1639662257985', '396197888', '127436980224']]

  await Storage(payloadAsArray, 'xyz', '123')

  const results = await models.GuardianMetaDiskUsage.findAll()

  expect(results.length).toBe(1)
  expect(results[0].measured_at).toEqual(moment(parseInt(payloadAsArray[2][1])).toDate())
  expect(results[0].internal_bytes_available).toBe(parseInt(payloadAsArray[2][3]))
  expect(results[0].internal_bytes_used).toBe(parseInt(payloadAsArray[2][2]))
  expect(results[0].external_bytes_available).toBe(parseInt(payloadAsArray[3][3]))
  expect(results[0].external_bytes_used).toBe(parseInt(payloadAsArray[3][2]))
})

test('shorten storage invalid', async () => {
  const payloadAsArray = [
    ['in', '1639662807198', '287502336', '1077907456'],
    ['ex', '1639662807198', '396197888', '127436980224'],
    ['in', '1639662257985', '287502336', '1077907456'],
    ['ex', '1639662257985', '396197888', '127436980224']]

  await Storage(payloadAsArray, 'xyz', '123')

  const results = await models.GuardianMetaDiskUsage.findAll()

  expect(results.length).toBe(0)
})

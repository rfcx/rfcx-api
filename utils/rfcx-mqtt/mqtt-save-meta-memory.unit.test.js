const moment = require('moment')
const { saveMeta: { Memory } } = require('./mqtt-save-meta')
const models = require('../../models')

jest.mock('../../models', () => {
  const memory = []
  return {
    GuardianMetaMemory: {
      findAll: () => Promise.resolve(memory),
      bulkCreate: (objects) => {
        memory.push(...objects)
        return Promise.resolve()
      }
    },
    reset: () => {
      while (memory.length) {
        memory.pop()
      }
    }
  }
})

beforeEach(async () => {
  await models.reset()
})

test('normal memory', async () => {
  const payloadAsArray = [
    ['system', '1639986182572', '309223424', '172429312', '57702400'],
    ['system', '1639986003785', '309149696', '172503040', '57702400'],
    ['system', '1639985825153', '309919744', '171732992', '57702400']]

  await Memory(payloadAsArray, 'xyz', '123')

  const results = await models.GuardianMetaMemory.findAll()

  expect(results.length).toBe(1)
  expect(results[0].measured_at).toEqual(moment(parseInt(payloadAsArray[2][1])).toDate())
  expect(results[0].system_bytes_available).toBe(parseInt(payloadAsArray[2][3]))
  expect(results[0].system_bytes_used).toBe(parseInt(payloadAsArray[2][2]))
  expect(results[0].system_bytes_minimum).toBe(parseInt(payloadAsArray[2][4]))
})

test('shorten memory', async () => {
  const payloadAsArray = [
    ['s', '1639986182572', '309223424', '172429312', '57702400'],
    ['s', '1639986003785', '309149696', '172503040', '57702400'],
    ['s', '1639985825153', '309919744', '171732992', '57702400']]

  await Memory(payloadAsArray, 'xyz', '123')

  const results = await models.GuardianMetaMemory.findAll()

  expect(results.length).toBe(1)
  expect(results[0].measured_at).toEqual(moment(parseInt(payloadAsArray[2][1])).toDate())
  expect(results[0].system_bytes_available).toBe(parseInt(payloadAsArray[2][3]))
  expect(results[0].system_bytes_used).toBe(parseInt(payloadAsArray[2][2]))
  expect(results[0].system_bytes_minimum).toBe(parseInt(payloadAsArray[2][4]))
})

test('shorten memory invalid', async () => {
  const payloadAsArray = [
    ['st', '1639986182572', '309223424', '172429312', '57702400'],
    ['st', '1639986003785', '309149696', '172503040', '57702400'],
    ['st', '1639985825153', '309919744', '171732992', '57702400']]

  await Memory(payloadAsArray, 'xyz', '123')

  const results = await models.GuardianMetaMemory.findAll()

  expect(results.length).toBe(0)
})
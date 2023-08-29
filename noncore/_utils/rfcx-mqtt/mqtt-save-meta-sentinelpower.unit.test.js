jest.mock('../../_models', () => { return {} })
jest.mock('../../../core/_models', () => {
  return {
    Classification: { attributes: {} },
    ClassifierDeployment: { attributes: {} },
    ClassifierOutput: { attributes: {} },
    User: { attributes: {} },
    Stream: { attributes: {} },
    Project: { attributes: {} }
  }
})

const moment = require('moment')
const { saveMeta: { SentinelPower } } = require('./mqtt-save-meta')
const models = require('../../_models')

jest.mock('../../_models', () => {
  const sentinelPower = []
  return {
    GuardianMetaSentinelPower: {
      findAll: () => Promise.resolve(sentinelPower),
      bulkCreate: (objects) => {
        sentinelPower.push(...objects)
        return Promise.resolve()
      }
    },
    Guardian: {
      update: () => Promise.resolve()
    },
    reset: () => {
      while (sentinelPower.length) {
        sentinelPower.pop()
      }
    }
  }
})

beforeEach(async () => {
  await models.reset()
})

test('can save sentinel power', async () => {
  const payloadAsArray = [
    ['system', '1639989299200', '8972', '90', '30', '783'],
    ['input', '1639989299200', '9008', '80', '8', '718'],
    ['battery', '1639989299200', '3363', '-20', '100.00', '-65'],
    ['system', '1639987444654', '8969', '80', '30', '710'],
    ['input', '1639987444654', '9009', '70', '8', '650'],
    ['battery', '1639987444654', '3363', '-20', '100.00', '-60'],
    ['system', '1639986182346', '8968', '116', '30', '1040'],
    ['input', '1639986182346', '9007', '108', '8', '977'],
    ['battery', '1639986182346', '3363', '-20', '100.00', '-63']]

  await SentinelPower(payloadAsArray, 'xyz', '123')

  const results = await models.GuardianMetaSentinelPower.findAll()
  expect(results.length).toBe(3)

  results.forEach((it, index) => {
    expect(it.measured_at).toEqual(moment(parseInt(payloadAsArray[index * 3][1])).toDate())
    expect(it.system_temperature).toBe(parseInt(payloadAsArray[index * 3][4]))
    expect(it.system_voltage).toBe(parseInt(payloadAsArray[index * 3][2]))
    expect(it.system_current).toBe(parseInt(payloadAsArray[index * 3][3]))
    expect(it.system_power).toBe(parseInt(payloadAsArray[index * 3][5]))
    expect(it.input_voltage).toBe(parseInt(payloadAsArray[index * 3 + 1][2]))
    expect(it.input_current).toBe(parseInt(payloadAsArray[index * 3 + 1][3]))
    expect(it.input_power).toBe(parseInt(payloadAsArray[index * 3 + 1][5]))
    expect(it.battery_state_of_charge).toBe(parseFloat(payloadAsArray[index * 3 + 2][4]))
    expect(it.battery_voltage).toBe(parseInt(payloadAsArray[index * 3 + 2][2]))
    expect(it.battery_current).toBe(parseInt(payloadAsArray[index * 3 + 2][3]))
    expect(it.battery_power).toBe(parseInt(payloadAsArray[index * 3 + 2][5]))
  })
})

test('can save sentinel power (compact format)', async () => {
  const payloadAsArray = [
    ['s', '1639989299200', '8972', '90', '30', '783'],
    ['i', '1639989299200', '9008', '80', '8', '718'],
    ['b', '1639989299200', '3363', '-20', '100.00', '-65'],
    ['s', '1639987444654', '8969', '80', '30', '710'],
    ['i', '1639987444654', '9009', '70', '8', '650'],
    ['b', '1639987444654', '3363', '-20', '100.00', '-60'],
    ['s', '1639986182346', '8968', '116', '30', '1040'],
    ['i', '1639986182346', '9007', '108', '8', '977'],
    ['b', '1639986182346', '3363', '-20', '100.00', '-63']]

  await SentinelPower(payloadAsArray, 'xyz', '123')

  const results = await models.GuardianMetaSentinelPower.findAll()
  expect(results.length).toBe(3)

  results.forEach((it, index) => {
    expect(it.measured_at).toEqual(moment(parseInt(payloadAsArray[index * 3][1])).toDate())
    expect(it.system_temperature).toBe(parseInt(payloadAsArray[index * 3][4]))
    expect(it.system_voltage).toBe(parseInt(payloadAsArray[index * 3][2]))
    expect(it.system_current).toBe(parseInt(payloadAsArray[index * 3][3]))
    expect(it.system_power).toBe(parseInt(payloadAsArray[index * 3][5]))
    expect(it.input_voltage).toBe(parseInt(payloadAsArray[index * 3 + 1][2]))
    expect(it.input_current).toBe(parseInt(payloadAsArray[index * 3 + 1][3]))
    expect(it.input_power).toBe(parseInt(payloadAsArray[index * 3 + 1][5]))
    expect(it.battery_state_of_charge).toBe(parseFloat(payloadAsArray[index * 3 + 2][4]))
    expect(it.battery_voltage).toBe(parseInt(payloadAsArray[index * 3 + 2][2]))
    expect(it.battery_current).toBe(parseInt(payloadAsArray[index * 3 + 2][3]))
    expect(it.battery_power).toBe(parseInt(payloadAsArray[index * 3 + 2][5]))
  })
})

jest.mock('../../_models', () => { return {} })
jest.mock('../../../core/_models', () => {
  return {
    ClassifierDeployment: { attributes: {} },
    ClassifierOutput: { attributes: {} },
    User: { attributes: {} },
    Stream: { attributes: {} },
    Project: { attributes: {} }
  }
})

const moment = require('moment')
const { saveMeta: { Battery } } = require('./mqtt-save-meta')
const models = require('../../_models')

jest.mock('../../_models', () => {
  const battery = []
  return {
    GuardianMetaBattery: {
      findAll: () => Promise.resolve(battery),
      bulkCreate: (objects) => {
        battery.push(...objects)
        return Promise.resolve()
      }
    },
    Guardian: {
      update: () => Promise.resolve()
    },
    reset: () => {
      while (battery.length) {
        battery.pop()
      }
    }
  }
})

beforeEach(async () => {
  await models.reset()
})

test('can save battery meta', async () => {
  const payloadAsArray = [
    ['1639990754314', '100', '25', '0', '1'],
    ['1639990558385', '100', '25', '0', '1']]

  await Battery(payloadAsArray, 'xyz', '123')

  const results = await models.GuardianMetaBattery.findAll()
  expect(results.length).toBe(2)

  payloadAsArray.forEach((it, index) => {
    expect(results[index].measured_at).toEqual(moment(parseInt(it[0])).toDate())
    expect(results[index].battery_percent).toBe(parseInt(it[1]))
    expect(results[index].battery_temperature).toBe(parseInt(it[2]))
    expect(results[index].is_charging).toBe(false)
    expect(results[index].is_fully_charged).toBe(true)
  })
})

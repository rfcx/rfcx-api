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
const { saveMeta: { Network } } = require('./mqtt-save-meta')
const models = require('../../_models')

jest.mock('../../_models', () => {
  const network = []
  return {
    GuardianMetaNetwork: {
      findAll: () => Promise.resolve(network),
      bulkCreate: (objects) => {
        network.push(...objects)
        return Promise.resolve()
      }
    },
    reset: () => {
      while (network.length) {
        network.pop()
      }
    }
  }
})

beforeEach(async () => {
  await models.reset()
})

test('can save network', async () => {
  const payloadAsArray = [
    ['1639662807479', '-91', 'hspa', 'AT&T'],
    ['1639661726813', '-91', 'hspa', 'AT&T'],
    ['1639661194334', '-97', 'hspa', 'AT&T']]

  await Network(payloadAsArray, 'xyz', '123')

  const results = await models.GuardianMetaNetwork.findAll()
  expect(results.length).toBe(3)

  payloadAsArray.forEach((it, index) => {
    expect(results[index].measured_at).toEqual(moment(parseInt(it[0])).toDate())
    expect(results[index].signal_strength).toBe(parseInt(it[1]))
    expect(results[index].network_type).toBe(it[2])
    expect(results[index].carrier_name).toBe(it[3])
  })
})

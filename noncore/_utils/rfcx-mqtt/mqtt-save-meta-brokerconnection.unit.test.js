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
const { saveMeta: { MqttBrokerConnection } } = require('./mqtt-save-meta')

const models = require('../../_models')

jest.mock('../../_models', () => {
  const broker = []
  return {
    GuardianMetaMqttBrokerConnection: {
      findAll: () => Promise.resolve(broker),
      bulkCreate: (objects) => {
        broker.push(...objects)
        return Promise.resolve()
      }
    },
    reset: () => {
      while (broker.length) {
        broker.pop()
      }
    }
  }
})

beforeEach(async () => {
  await models.reset()
})

test('can save broker connection meta', async () => {
  const payloadAsArray = [
    ['1639986160114', '29953', '455', 'ssl://api-mqtt.rfcx.org:8883'],
    ['1639985978216', '9280', '476', 'ssl://api-mqtt.rfcx.org:8883'],
    ['1639985473946', '42446', '675', 'ssl://api-mqtt.rfcx.org:8883']]

  await MqttBrokerConnection(payloadAsArray, 'xyz', '123')

  const results = await models.GuardianMetaMqttBrokerConnection.findAll()
  expect(results.length).toBe(3)

  payloadAsArray.forEach((it, index) => {
    expect(results[index].connected_at).toEqual(moment(parseInt(it[0])).toDate())
    expect(results[index].connection_latency).toBe(parseInt(it[1]))
    expect(results[index].subscription_latency).toBe(parseInt(it[2]))
    expect(results[index].broker_uri).toBe(it[3])
  })
})

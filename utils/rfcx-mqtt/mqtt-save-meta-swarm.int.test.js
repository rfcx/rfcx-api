const moment = require('moment')
const { saveMeta: { SwarmDiagnostics } } = require('./mqtt-save-meta')
const models = require('../../models')

jest.mock('../../models', () => {
  const networks = []
  return {
    GuardianMetaNetwork: {
      findAll: () => networks,
      bulkCreate: (objects) => {
        networks.push(...objects)
      }
    },
    reset: () => {
      while (networks.length) {
        networks.pop()
      }
    }
  }
})

beforeEach(async () => {
  await models.reset()
})

test('background and unsent', async () => {
  const measuredAt = 1420070745567
  const backgroundRssi = -101
  const unsentMessageCount = 5
  const input = [measuredAt.toString(), backgroundRssi.toString(), unsentMessageCount.toString()]

  await SwarmDiagnostics([input], 'xyz', '123')

  const results = await models.GuardianMetaNetwork.findAll()
  expect(results.length).toBe(1)
  expect(results[0].measured_at).toEqual(moment(measuredAt).toDate())
  expect(results[0].signal_strength).toBe(backgroundRssi)
})

test('background and unsent with empty satellite values', async () => {
  const measuredAt = 1420070745567
  const backgroundRssi = -101
  const unsentMessageCount = 5
  const input = [measuredAt.toString(), backgroundRssi.toString(), '', '', '', '', '', unsentMessageCount.toString()]

  await SwarmDiagnostics([input], 'xyz', '123')

  const results = await models.GuardianMetaNetwork.findAll()
  expect(results.length).toBe(1)
  expect(results[0].measured_at).toEqual(moment(measuredAt).toDate())
  expect(results[0].signal_strength).toBe(backgroundRssi)
})

test('background, satellite, and unsent', async () => {
  const measuredAt = 1420070745567
  const backgroundRssi = -101
  const satelliteRssi = -95
  const signalToNoiseRatio = 7
  const frequencyDeviation = 11
  const timestamp = '2021-09-30 10:10:10'
  const satelliteId = '0x1234AB'
  const unsentMessageCount = 5
  const input = [measuredAt.toString(), backgroundRssi.toString(), satelliteRssi.toString(), signalToNoiseRatio.toString(), frequencyDeviation.toString(), timestamp, satelliteId, unsentMessageCount.toString()]

  await SwarmDiagnostics([input], 'xyz', '123')

  const results = await models.GuardianMetaNetwork.findAll()
  expect(results.length).toBe(2)
  expect(results[0].measured_at).toEqual(moment(measuredAt).toDate())
  expect(results[1].measured_at).toEqual(moment(measuredAt).toDate())
  expect(results[0].signal_strength).toBe(backgroundRssi)
  expect(results[1].signal_strength).toBe(satelliteRssi)
})
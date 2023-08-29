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

const { saveMeta: { CheckInStatus } } = require('./mqtt-save-meta')
const models = require('../../_models')

const compactKeysCheckIns = { s: 'sent', q: 'queued', m: 'meta', sk: 'skipped', st: 'stashed', a: 'archived', v: 'vault' }

jest.mock('../../_models', () => {
  const checkins = []
  return {
    GuardianMetaCheckInStatus: {
      findAll: () => Promise.resolve(checkins),
      bulkCreate: (objects) => {
        checkins.push(...objects)
        return Promise.resolve()
      }
    },
    reset: () => {
      while (checkins.length) {
        checkins.pop()
      }
    }
  }
})

beforeEach(async () => {
  await models.reset()
})

test('can save checkins meta', async () => {
  const payloadAsArray = [
    ['sent', '0', '0'],
    ['queued', '602', '83754671'],
    ['meta', '3578', '1854340'],
    ['skipped', '111', '15615927'],
    ['stashed', '1308', '182350178'],
    ['archived', '6041', '883907072'],
    ['vault', '0', '0']]

  await CheckInStatus(payloadAsArray, 'xyz', '123')

  const results = await models.GuardianMetaCheckInStatus.findAll()

  expect(results.length).toBe(1)
  payloadAsArray.forEach((it) => {
    expect(results[0][it[0] + '_count']).toBe(parseInt(it[1]))
    expect(results[0][it[0] + '_size_bytes']).toBe(parseInt(it[2]))
  })
})

test('can save checkins meta (compact format)', async () => {
  const payloadAsArray = [
    ['s', '0', '0'],
    ['q', '602', '83754671'],
    ['m', '3578', '1854340'],
    ['sk', '111', '15615927'],
    ['st', '1308', '182350178'],
    ['a', '6041', '883907072'],
    ['v', '0', '0']]

  await CheckInStatus(payloadAsArray, 'xyz', '123')

  const results = await models.GuardianMetaCheckInStatus.findAll()

  expect(results.length).toBe(1)
  payloadAsArray.forEach((it) => {
    expect(results[0][compactKeysCheckIns[it[0]] + '_count']).toBe(parseInt(it[1]))
    expect(results[0][compactKeysCheckIns[it[0]] + '_size_bytes']).toBe(parseInt(it[2]))
  })
})

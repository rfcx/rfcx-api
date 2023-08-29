jest.mock('../../_models', () => { return { GuardianMetaAssetExchangeLog: {}, Sequelize: { Op: {} } } })
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

const { checkInDatabase: { updateDbMetaAssetsExchangeLog } } = require('./mqtt-database')
const model = require('../../_models')
const { expandAbbreviatedFieldNames } = require('./expand-abbreviated')
const or = model.Sequelize.Op.or

beforeEach(() => {
  model.GuardianMetaAssetExchangeLog.findOrCreate = jest.fn().mockImplementation(() => Promise.resolve())
  model.GuardianMetaAssetExchangeLog.destroy = jest.fn().mockImplementation(() => Promise.resolve())
})

test('meta ids save is called', async () => {
  const json = { meta_ids: metaIdsExample }
  const guardianId = 'xyz'
  const checkinId = 'abc'
  const checkin = makeCheckin(json, guardianId, checkinId)

  await updateDbMetaAssetsExchangeLog(checkin)

  expect(model.GuardianMetaAssetExchangeLog.findOrCreate).toHaveBeenCalledTimes(3)
  expect(model.GuardianMetaAssetExchangeLog.destroy).toHaveBeenCalledTimes(0)
})

test('meta ids and detection ids save is called', async () => {
  const json = { meta_ids: metaIdsExample, detection_ids: detectionIdsExample }
  const guardianId = 'xyz'
  const checkinId = 'abc'
  const checkin = makeCheckin(json, guardianId, checkinId)

  await updateDbMetaAssetsExchangeLog(checkin)

  expect(model.GuardianMetaAssetExchangeLog.findOrCreate).toHaveBeenCalledTimes(6)
  expect(model.GuardianMetaAssetExchangeLog.destroy).toHaveBeenCalledTimes(0)
})

test('meta ids and detection ids save is called and purged is destroyed', async () => {
  const json = { meta_ids: metaIdsExample, detection_ids: detectionIdsExample, purged: purgedExample }
  const guardianId = 'xyz'
  const checkinId = 'abc'
  const checkin = makeCheckin(json, guardianId, checkinId)

  await updateDbMetaAssetsExchangeLog(checkin)

  expect(model.GuardianMetaAssetExchangeLog.findOrCreate).toHaveBeenCalledTimes(6)
  const where = model.GuardianMetaAssetExchangeLog.destroy.mock.calls[0][0].where[or]
  expect(where[0].guardian_id).toBe(guardianId)
  expect(where[1].guardian_id).toBe(guardianId)
  expect(where[2].guardian_id).toBe(guardianId)
  expect(where[0].asset_type).toBe('meta')
  expect(where[1].asset_type).toBe('meta')
  expect(where[2].asset_type).toBe('meta')
  expect(where[0].asset_id).toBe('1640654813742')
  expect(where[1].asset_id).toBe('1640654903858')
  expect(where[2].asset_id).toBe('1640654993886')
})

test('only purged is destroyed', async () => {
  const json = { purged: purgedExample }
  const guardianId = 'xyz'
  const checkinId = 'abc'
  const checkin = makeCheckin(json, guardianId, checkinId)

  await updateDbMetaAssetsExchangeLog(checkin)

  expect(model.GuardianMetaAssetExchangeLog.findOrCreate).toHaveBeenCalledTimes(0)
  const where = model.GuardianMetaAssetExchangeLog.destroy.mock.calls[0][0].where[or]
  expect(where[0].guardian_id).toBe(guardianId)
  expect(where[1].guardian_id).toBe(guardianId)
  expect(where[2].guardian_id).toBe(guardianId)
  expect(where[0].asset_type).toBe('meta')
  expect(where[1].asset_type).toBe('meta')
  expect(where[2].asset_type).toBe('meta')
  expect(where[0].asset_id).toBe('1640654813742')
  expect(where[1].asset_id).toBe('1640654903858')
  expect(where[2].asset_id).toBe('1640654993886')
})

test('meta ids and detection ids save is called and purged is destroyed all abbreviated', async () => {
  const json = { mid: metaIdsExample, did: detectionIdsExample, p: purgedExample }
  const guardianId = 'xyz'
  const checkinId = 'abc'
  const checkin = makeCheckin(json, guardianId, checkinId)

  await updateDbMetaAssetsExchangeLog(checkin)

  expect(model.GuardianMetaAssetExchangeLog.findOrCreate).toHaveBeenCalledTimes(6)
  const where = model.GuardianMetaAssetExchangeLog.destroy.mock.calls[0][0].where[or]
  expect(where[0].guardian_id).toBe(guardianId)
  expect(where[1].guardian_id).toBe(guardianId)
  expect(where[2].guardian_id).toBe(guardianId)
  expect(where[0].asset_type).toBe('meta')
  expect(where[1].asset_type).toBe('meta')
  expect(where[2].asset_type).toBe('meta')
  expect(where[0].asset_id).toBe('1640654813742')
  expect(where[1].asset_id).toBe('1640654903858')
  expect(where[2].asset_id).toBe('1640654993886')
})

test('meta ids and detection ids save is called and purged is destroyed all abbreviated except purged', async () => {
  const json = { mid: metaIdsExample, did: detectionIdsExample, purged: purgedExample }
  const guardianId = 'xyz'
  const checkinId = 'abc'
  const checkin = makeCheckin(json, guardianId, checkinId)

  await updateDbMetaAssetsExchangeLog(checkin)

  expect(model.GuardianMetaAssetExchangeLog.findOrCreate).toHaveBeenCalledTimes(6)
  const where = model.GuardianMetaAssetExchangeLog.destroy.mock.calls[0][0].where[or]
  expect(where[0].guardian_id).toBe(guardianId)
  expect(where[1].guardian_id).toBe(guardianId)
  expect(where[2].guardian_id).toBe(guardianId)
  expect(where[0].asset_type).toBe('meta')
  expect(where[1].asset_type).toBe('meta')
  expect(where[2].asset_type).toBe('meta')
  expect(where[0].asset_id).toBe('1640654813742')
  expect(where[1].asset_id).toBe('1640654903858')
  expect(where[2].asset_id).toBe('1640654993886')
})

test('meta ids and detection ids save is called and purged is destroyed all abbreviated but wrong purged', async () => {
  const json = { mid: metaIdsExample, did: detectionIdsExample, pg: purgedExample }
  const guardianId = 'xyz'
  const checkinId = 'abc'
  const checkin = makeCheckin(json, guardianId, checkinId)

  await updateDbMetaAssetsExchangeLog(checkin)

  expect(model.GuardianMetaAssetExchangeLog.findOrCreate).toHaveBeenCalledTimes(6)
  expect(model.GuardianMetaAssetExchangeLog.destroy).toHaveBeenCalledTimes(0)
})

const metaIdsExample = [
  '1001',
  '1002',
  '1003'
]

const detectionIdsExample = [
  '2001',
  '2002',
  '2003'
]

const purgedExample = 'meta*1640654813742|meta*1640654903858|meta*1640654993886'

function makeCheckin (json, guardianId, checkinId) {
  return expandAbbreviatedFieldNames({
    db: {
      dbGuardian: {
        id: guardianId
      },
      dbCheckIn: {
        id: checkinId
      }
    },
    json,
    rtrn: {
      obj: {
        messages: {}
      }
    }
  })
}

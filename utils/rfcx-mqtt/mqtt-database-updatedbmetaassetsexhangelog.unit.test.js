const { checkInDatabase: { updateDbMetaAssetsExchangeLog } } = require('./mqtt-database')
const model = require('../../models')
const { expandAbbreviatedFieldNames } = require('./expand-abbreviated')

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
  expect(model.GuardianMetaAssetExchangeLog.destroy).toHaveBeenCalledTimes(3)
})

test('only purged is destroyed', async () => {
  const json = { purged: purgedExample }
  const guardianId = 'xyz'
  const checkinId = 'abc'
  const checkin = makeCheckin(json, guardianId, checkinId)

  await updateDbMetaAssetsExchangeLog(checkin)

  expect(model.GuardianMetaAssetExchangeLog.findOrCreate).toHaveBeenCalledTimes(0)
  expect(model.GuardianMetaAssetExchangeLog.destroy).toHaveBeenCalledTimes(3)
})

test('meta ids and detection ids save is called and purged is destroyed all abbreviated', async () => {
  const json = { mid: metaIdsExample, did: detectionIdsExample, p: purgedExample }
  const guardianId = 'xyz'
  const checkinId = 'abc'
  const checkin = makeCheckin(json, guardianId, checkinId)

  await updateDbMetaAssetsExchangeLog(checkin)

  expect(model.GuardianMetaAssetExchangeLog.findOrCreate).toHaveBeenCalledTimes(6)
  expect(model.GuardianMetaAssetExchangeLog.destroy).toHaveBeenCalledTimes(3)
})

test('meta ids and detection ids save is called and purged is destroyed all abbreviated except purged', async () => {
  const json = { mid: metaIdsExample, did: detectionIdsExample, purged: purgedExample }
  const guardianId = 'xyz'
  const checkinId = 'abc'
  const checkin = makeCheckin(json, guardianId, checkinId)

  await updateDbMetaAssetsExchangeLog(checkin)

  expect(model.GuardianMetaAssetExchangeLog.findOrCreate).toHaveBeenCalledTimes(6)
  expect(model.GuardianMetaAssetExchangeLog.destroy).toHaveBeenCalledTimes(3)
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

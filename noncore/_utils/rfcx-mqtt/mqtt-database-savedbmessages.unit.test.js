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

const { checkInDatabase: { saveDbMessages } } = require('./mqtt-database')
const smsMessages = require('../rfcx-guardian/guardian-sms-database').messages
const { expandAbbreviatedFieldNames } = require('./expand-abbreviated')

jest.mock('./mqtt-save-meta')

beforeEach(() => {
  smsMessages.save = jest.fn().mockImplementation(() => Promise.resolve())
})

test('messages save is called but empty sms', async () => {
  const json = { messages: messageExample }
  const guardianId = 'xyz'
  const checkinId = 'abc'
  const checkin = makeCheckin(json, guardianId, checkinId)
  smsMessages.info = jest.fn().mockImplementation(() => Promise.resolve())

  await saveDbMessages(checkin)

  expect(smsMessages.info).toHaveBeenCalledTimes(1)
  expect(smsMessages.info).toHaveBeenCalledWith(messageExample, guardianId, checkinId)
  expect(smsMessages.save).toHaveBeenCalledTimes(0)
})

test('messages save is called with sms', async () => {
  const json = { messages: messageExample }
  const guardianId = 'xyz'
  const checkinId = 'abc'
  const checkin = makeCheckin(json, guardianId, checkinId)
  smsMessages.info = jest.fn().mockImplementation(() => messageExample)

  await saveDbMessages(checkin)

  expect(smsMessages.info).toHaveBeenCalledTimes(1)
  expect(smsMessages.info).toHaveBeenCalledWith(messageExample, guardianId, checkinId)
  expect(smsMessages.save).toHaveBeenCalledTimes(1)
})

test('messages save is called with sms abbreviated', async () => {
  const json = { msg: messageExample }
  const guardianId = 'xyz'
  const checkinId = 'abc'
  const checkin = makeCheckin(json, guardianId, checkinId)
  smsMessages.info = jest.fn().mockImplementation(() => messageExample)

  await saveDbMessages(checkin)

  expect(smsMessages.info).toHaveBeenCalledTimes(1)
  expect(smsMessages.info).toHaveBeenCalledWith(messageExample, guardianId, checkinId)
  expect(smsMessages.save).toHaveBeenCalledTimes(1)
})

test('messages save is called with sms wrong abbreviated', async () => {
  const json = { msgs: messageExample }
  const guardianId = 'xyz'
  const checkinId = 'abc'
  const checkin = makeCheckin(json, guardianId, checkinId)
  smsMessages.info = jest.fn().mockImplementation(() => Promise.resolve())

  await saveDbMessages(checkin)

  expect(smsMessages.info).toHaveBeenCalledTimes(1)
  expect(smsMessages.info).toHaveBeenCalledWith(undefined, guardianId, checkinId)
  expect(smsMessages.save).toHaveBeenCalledTimes(0)
})

const messageExample = [{ 1: { android_id: 1 } }]

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

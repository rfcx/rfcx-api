jest.mock('../../_models', () => { return { GuardianSoftwarePrefs: {} } })
jest.mock('../../../core/_models', () => {
  return {
    ClassifierDeployment: { attributes: {} },
    ClassifierOutput: { attributes: {} },
    User: { attributes: {} },
    Stream: { attributes: {} },
    Project: { attributes: {} }
  }
})

const { checkInDatabase: { syncGuardianPrefs } } = require('./mqtt-database')
const model = require('../../_models')
const { expandAbbreviatedFieldNames } = require('./expand-abbreviated')

beforeEach(() => {
  model.GuardianSoftwarePrefs.findOrCreate = jest.fn().mockImplementation(() => Promise.resolve())
  model.GuardianSoftwarePrefs.destroy = jest.fn().mockImplementation(() => Promise.resolve())
  model.GuardianSoftwarePrefs.findAll = jest.fn().mockImplementation(() => Promise.resolve(findAllMockData))
})

test('prefs save is called', async () => {
  const json = { prefs: prefsExample }
  const guardianId = 'xyz'
  const checkinId = 'abc'
  const checkin = makeCheckin(json, guardianId, checkinId)

  await syncGuardianPrefs(checkin)

  expect(model.GuardianSoftwarePrefs.findOrCreate).toHaveBeenCalledTimes(2)
  expect(model.GuardianSoftwarePrefs.destroy).toHaveBeenCalledTimes(1)
})

test('prefs save is called but same prefs and sha1', async () => {
  const json = { prefs: { ...prefsExample, sha1: findAllSha1 } }
  const guardianId = 'xyz'
  const checkinId = 'abc'
  const checkin = makeCheckin(json, guardianId, checkinId)

  await syncGuardianPrefs(checkin)

  expect(model.GuardianSoftwarePrefs.findOrCreate).toHaveBeenCalledTimes(0)
  expect(model.GuardianSoftwarePrefs.destroy).toHaveBeenCalledTimes(0)
})

test('abbreviated prefs save is called', async () => {
  const json = { pf: prefsExample }
  const guardianId = 'xyz'
  const checkinId = 'abc'
  const checkin = makeCheckin(json, guardianId, checkinId)

  await syncGuardianPrefs(checkin)

  expect(model.GuardianSoftwarePrefs.findOrCreate).toHaveBeenCalledTimes(2)
  expect(model.GuardianSoftwarePrefs.destroy).toHaveBeenCalledTimes(1)
})

test('abbreviated prefs save is called with abbreviated fields inside', async () => {
  const json = { pf: { s: prefsExample.sha1, v: prefsExample.vals } }
  const guardianId = 'xyz'
  const checkinId = 'abc'
  const checkin = makeCheckin(json, guardianId, checkinId)

  await syncGuardianPrefs(checkin)

  expect(model.GuardianSoftwarePrefs.findOrCreate).toHaveBeenCalledTimes(2)
  expect(model.GuardianSoftwarePrefs.destroy).toHaveBeenCalledTimes(1)
})

test('wrong abbreviated prefs save is called with abbreviated fields inside', async () => {
  const json = { pfs: { s: prefsExample.sha1, v: prefsExample.vals } }
  const guardianId = 'xyz'
  const checkinId = 'abc'
  const checkin = makeCheckin(json, guardianId, checkinId)

  await syncGuardianPrefs(checkin)

  expect(model.GuardianSoftwarePrefs.findOrCreate).toHaveBeenCalledTimes(0)
  expect(model.GuardianSoftwarePrefs.destroy).toHaveBeenCalledTimes(0)
})

test('abbreviated prefs save is called with wrong abbreviated fields inside', async () => {
  const json = { pfs: { sh: prefsExample.sha1, vs: prefsExample.vals } }
  const guardianId = 'xyz'
  const checkinId = 'abc'
  const checkin = makeCheckin(json, guardianId, checkinId)

  await syncGuardianPrefs(checkin)

  expect(model.GuardianSoftwarePrefs.findOrCreate).toHaveBeenCalledTimes(0)
  expect(model.GuardianSoftwarePrefs.destroy).toHaveBeenCalledTimes(0)
})

const prefsExample = {
  sha1: '323bac4c3f4ec6962fc406b9f92468305b19c080',
  vals: {
    test_pref1: 'true',
    test_pref2: 'false'
  }
}

const findAllMockData = [
  {
    pref_key: 'test_pref1',
    pref_value: 'true'
  }
]

const findAllSha1 = '4fbf3fee33c55a16864dceee62f1af1ddcfbfada'

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

const { saveMeta: { SoftwareRoleVersion } } = require('./mqtt-save-meta')
const models = require('../../models')

jest.mock('../../models', () => {
  const softwareVersions = []
  const saveMock = jest.fn()
  const findOrCreateMock = jest.fn()
  return {
    GuardianSoftwareVersion: {
      findAll: () => Promise.resolve(softwareVersions),
      findOrCreate: () => findOrCreateMock.mockImplementation(() => Promise.resolve([
        {
          save: () => saveMock
        }
      ]))
    },
    GuardianSoftware: {
      findOne: () => {
        return Promise.resolve(softwareVersions)
      }
    },
    GuardianMetaSoftwareVersion: {
      findOrCreate: () => findOrCreateMock.mockImplementation(() => Promise.resolve([
        {
          save: () => saveMock
        }
      ]))
    },
    reset: () => {
      while (softwareVersions.length) {
        softwareVersions.pop()
      }
    },
    save: saveMock
  }
})

beforeEach(async () => {
  await models.reset()
})

test('normal software', async () => {
  const payloadAsArray = [
    ['guardian', '0.8.9'],
    ['admin', '0.8.8'],
    ['classify', '0.8.3'],
    ['updater', '0.8.1']]

  await SoftwareRoleVersion(payloadAsArray, 'xyz', '123')

  expect(models.save).toHaveBeenCalled()
})

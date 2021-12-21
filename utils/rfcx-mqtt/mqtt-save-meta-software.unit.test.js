const { saveMeta: { SoftwareRoleVersion } } = require('./mqtt-save-meta')
const models = require('../../models')

jest.mock('../../models', () => {
  const software = [
    { id: 4, role: 'guardian' },
    { id: 5, role: 'admin' },
    { id: 6, role: 'classify' }
  ]
  const softwareVersions = []
  const metaSoftwareVersions = []
  return {
    GuardianSoftware: {
      findOne: (options) => {
        return Promise.resolve(software.find(s => s.role === options.where.role))
      }
    },
    GuardianSoftwareVersion: {
      findAll: (options) => {
        const filteredSoftwareVersions = options && options.where ? softwareVersions.filter(sv => sv.software_role_id === options.where.software_role_id && sv.version === options.where.version) : softwareVersions
        return Promise.resolve(filteredSoftwareVersions)
      },
      findOrCreate: (options) => {
        let softwareVersion = softwareVersions.find(sv => sv.software_role_id === options.where.software_role_id && sv.version === options.where.version)
        let wasInserted = false
        if (softwareVersion === undefined) {
          softwareVersion = options.where
          softwareVersions.push(softwareVersion)
          wasInserted = true
        }
        return Promise.resolve([{ ...softwareVersion, save: () => Promise.resolve() }, wasInserted])
      }
    },
    GuardianMetaSoftwareVersion: {
      findAll: () => Promise.resolve(metaSoftwareVersions),
      findOrCreate: (options) => {
        let metaSoftwareVersion = metaSoftwareVersions.find(sv => sv.guardian_id === options.where.guardian_id && sv.software_id === options.where.software_id && sv.version_id === options.where.version_id)
        let wasInserted = false
        if (metaSoftwareVersion === undefined) {
          metaSoftwareVersion = options.where
          metaSoftwareVersions.push(metaSoftwareVersion)
          wasInserted = true
        }
        return Promise.resolve([{ ...metaSoftwareVersion, save: () => Promise.resolve() }, wasInserted])
      }
    },
    reset: () => {
      while (softwareVersions.length) {
        softwareVersions.pop()
      }
      while (metaSoftwareVersions.length) {
        metaSoftwareVersions.pop()
      }
    }
  }
})

beforeEach(async () => {
  await models.reset()
})

test('normal software', async () => {
  const payloadAsArray = [
    ['guardian', '0.8.9'],
    ['admin', '0.8.8'],
    ['classify', '0.8.3']]

  await SoftwareRoleVersion(payloadAsArray, 'xyz', '123')

  const softwareVersions = await models.GuardianSoftwareVersion.findAll()
  const metaSoftwareVersions = await models.GuardianMetaSoftwareVersion.findAll()
  expect(softwareVersions.length).toBe(3)
  expect(metaSoftwareVersions.length).toBe(0)
})

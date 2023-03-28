jest.mock('../../_models', () => { return {} })
jest.mock('../../../core/_models', () => {
  return {
    ClassifierDeployment: { attributes: {} },
    ClassifierOutput: { attributes: {} },
    User: { attributes: {}, include: jest.fn() },
    Stream: { attributes: {} },
    Project: { attributes: {}, include: jest.fn() },
    Role: { attributes: {} },
    RolePermission: { attributes: {} },
    Organization: { attributes: {}, include: jest.fn() }
  }
})

console.error = () => undefined
const { guardianMsgParsingUtils } = require('./guardian-msg-parsing-utils')
const { pingRouter } = require('./router-ping')
const models = require('../../_models')

jest.mock('../../_models', () => {
  const logs = []
  return {
    Sequelize: { Op: { in: 'in' } },
    GuardianMetaSegmentsReceived: {
      destroy: jest.fn()
    },
    GuardianMetaSegmentsGroup: {
      destroy: jest.fn()
    },
    GuardianMetaSegmentsGroupLog: {
      findAll: () => logs,
      create: (object) => {
        logs.push(object)
      }
    },
    reset: () => {
      while (logs.length) {
        logs.pop()
      }
    }
  }
})

beforeEach(async () => {
  await models.reset()
  console.info = () => undefined
})

test('group is logged', async () => {
  const group = { type: 'xyz', guid: 'abC3', guardian_id: 5, segment_count: 23, checksum_snippet: '' }
  const payload = { test: 'hello' }
  guardianMsgParsingUtils.decodeSegmentsToJSON = () => {
    return Promise.resolve(payload)
  }

  await guardianMsgParsingUtils.assembleReceivedSegments([{}], group, 'abc', null)

  const results = await models.GuardianMetaSegmentsGroupLog.findAll()
  expect(results.length).toBe(1)
  expect(results[0].guardian_id).toBe(group.guardian_id)
  expect(results[0].group_guid).toBe(group.guid)
  expect(JSON.parse(results[0].payload)).toEqual(payload)
})

test('group is destroyed', async () => {
  const group = { type: 'xyz', guid: 'abC3', guardian_id: 5, segment_count: 23, checksum_snippet: '' }
  const payload = { test: 'hello' }
  guardianMsgParsingUtils.decodeSegmentsToJSON = () => {
    return Promise.resolve(payload)
  }

  await guardianMsgParsingUtils.assembleReceivedSegments([{}], group, 'abc', null)

  expect(models.GuardianMetaSegmentsGroup.destroy).toHaveBeenCalled()
  expect(models.GuardianMetaSegmentsReceived.destroy).toHaveBeenCalled()
})

test('onMessagePing is called (when a type is png)', async () => {
  const group = { type: 'png', guid: 'abC3', guardian_id: 5, segment_count: 23, checksum_snippet: '' }
  const payload = { }
  guardianMsgParsingUtils.decodeSegmentsToJSON = () => {
    return Promise.resolve(payload)
  }
  pingRouter.onMessagePing = jest.fn(() => ({ obj: {} }))

  await guardianMsgParsingUtils.assembleReceivedSegments([{}], group, 'abc', null)

  expect(pingRouter.onMessagePing).toHaveBeenCalled()
})

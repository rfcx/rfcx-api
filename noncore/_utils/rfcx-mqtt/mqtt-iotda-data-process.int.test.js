const models = require('../../_models')
const { parse } = require('./mqtt-iotda-data-process')

jest.mock('../../_models', () => {
  const actual = jest.requireActual('../../_models')
  let battery = {}
  let sentinel = {}
  return {
    Sequelize: actual.Sequelize,
    GuardianMetaBattery: {
      findOne: (objects) => Promise.resolve(battery),
      findOrCreate: (objects) => {
        battery = { ...objects }
        return Promise.resolve(battery)
      }
    },
    GuardianMetaSentinelPower: {
      findOne: (objects) => Promise.resolve(sentinel),
      findOrCreate: (objects) => {
        sentinel = { ...objects }
        return Promise.resolve(sentinel)
      }
    },
    reset: () => {
      while (battery.length) {
        battery = {}
      }
      while (sentinel.length) {
        sentinel = {}
      }
    }
  }
})

beforeEach(async () => {
  await models.reset()
})

async function commonSetup () {
  const battery = { measured_at: new Date(), battery_percent: 100, guardian_id: 1 }
  await models.GuardianMetaBattery.findOrCreate(battery)
  const sentinelPower = { measured_at: new Date(), system_power: 100, input_power: 1, battery_state_of_charge: 20, guardian_id: 1 }
  await models.GuardianMetaSentinelPower.findOrCreate(sentinelPower)
  return { battery, sentinelPower }
}

test('can parse checkin message to iotda message', async () => {
  await commonSetup()
  const checkin = makeCheckin('xyz', 'abc', 'stream-test0', 'project-test')

  const iotdaMessage = await parse(checkin)

  expect(iotdaMessage.services[0].properties.internalBatteryPercentage).toBe(100)
  expect(iotdaMessage.services[0].properties.mainBatteryPercentage).toBe(20)
  expect(iotdaMessage.services[0].properties.systemPower).toBe(100)
  expect(iotdaMessage.services[0].properties.inputPower).toBe(1)
})

test('cannot parse checkin message if no timestamp', async () => {
  await commonSetup()
  const checkin = makeCheckin('xyz', 'abc', 'stream-test0', 'project-test')
  checkin.json.sentinel_power = null

  const iotdaMessage = await parse(checkin)

  expect(iotdaMessage).toBeNull()
})

function makeCheckin (guardianId, checkinId, streamId, projectId) {
  return {
    db: {
      dbGuardian: {
        id: 1,
        guid: guardianId,
        stream_id: streamId,
        project_id: projectId
      },
      dbCheckIn: {
        id: checkinId
      }
    },
    json: {
      sentinel_power: 's*1690801091393*3276*240*29*786|i*1690801091393*100*10*256*1|b*1690801091393*3293*-239*78.08*-786'
    }
  }
}

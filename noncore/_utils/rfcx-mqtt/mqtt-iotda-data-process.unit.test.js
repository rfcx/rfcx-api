const { expandAbbreviatedFieldNames } = require('./expand-abbreviated')
const { parse, getIoTDAConnectionOptions } = require('./mqtt-iotda-data-process')
const moment = require('moment')

test('can parse checkin message to iotda message', async () => {
  const json = { btt: join(batteryExample) }
  const checkin = makeCheckin(json, 'xyz', 'abc')

  const iotdaMessage = parse(checkin)

  expect(iotdaMessage.services[0].properties.batteryPercentage).toBe(100)
  expect(iotdaMessage.services[0].properties.batteryTemp).toBe(25)
  expect(iotdaMessage.services[0].event_time).toBe('20211220T085558Z')
})

test('can parse correct iotda connect options', async () => {
  const json = { btt: join(batteryExample) }
  const checkin = makeCheckin(json, 'xyz', 'abc')

  const options = getIoTDAConnectionOptions(checkin, moment(1639990558385).utc())

  expect(options.clientId).toBe('xyz_0_0_2021122008')
  expect(options.username).toBe('xyz')
  expect(options.password).toBe('729cd5aabd32516735127b85ba70c11623ed944c08338edbbcf459f0a522d0ca')
})

const batteryExample = [
  ['1639990754314', '60', '30', '0', '1'],
  ['1639990558385', '100', '25', '0', '1']
]

function join (arrayOfArray) {
  return arrayOfArray.map(array => array.join('*')).join('|')
}

function makeCheckin (json, guardianId, checkinId, streamId, projectId) {
  return expandAbbreviatedFieldNames({
    db: {
      dbGuardian: {
        guid: guardianId,
        stream_id: streamId,
        project_id: projectId
      },
      dbCheckIn: {
        id: checkinId
      }
    },
    json
  })
}

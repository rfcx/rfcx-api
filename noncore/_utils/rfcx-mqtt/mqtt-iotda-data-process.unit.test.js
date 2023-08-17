const { getIoTDAConnectionOptions } = require('./mqtt-iotda-data-process')
const moment = require('moment')

test('can parse correct iotda connect options', async () => {
  const checkin = makeCheckin('xyz', 'abc', 'stream-test0', 'project-test')

  const options = getIoTDAConnectionOptions(checkin, moment(1639990558385).utc())

  expect(options.clientId).toBe('xyz_0_0_2021122008')
  expect(options.username).toBe('xyz')
  expect(options.password).toBe('729cd5aabd32516735127b85ba70c11623ed944c08338edbbcf459f0a522d0ca')
})

function makeCheckin (guardianId, checkinId, streamId, projectId) {
  return {
    db: {
      dbGuardian: {
        guid: guardianId,
        stream_id: streamId,
        project_id: projectId
      },
      dbCheckIn: {
        id: checkinId
      }
    }
  }
}

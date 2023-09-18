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

const { checkInDatabase: { createDbSaveMeta } } = require('./mqtt-database')
const { saveMeta } = require('./mqtt-save-meta')
const { expandAbbreviatedFieldNames } = require('./expand-abbreviated')

jest.mock('./mqtt-save-meta')

beforeEach(() => {
  saveMeta.CPU = jest.fn().mockImplementation(() => Promise.resolve())
  saveMeta.Battery = jest.fn().mockImplementation(() => Promise.resolve())
  saveMeta.DataTransfer = jest.fn().mockImplementation(() => Promise.resolve())
  saveMeta.Network = jest.fn().mockImplementation(() => Promise.resolve())
  saveMeta.Storage = jest.fn().mockImplementation(() => Promise.resolve())
  saveMeta.Memory = jest.fn().mockImplementation(() => Promise.resolve())
  saveMeta.MqttBrokerConnection = jest.fn().mockImplementation(() => Promise.resolve())
  saveMeta.Detections = jest.fn().mockImplementation(() => Promise.resolve())
  saveMeta.SoftwareRoleVersion = jest.fn().mockImplementation(() => Promise.resolve())
  saveMeta.CheckInStatus = jest.fn().mockImplementation(() => Promise.resolve())
  saveMeta.SentinelPower = jest.fn().mockImplementation(() => Promise.resolve())
  saveMeta.Device = jest.fn().mockImplementation(() => Promise.resolve())
  saveMeta.SwarmDiagnostics = jest.fn().mockImplementation(() => Promise.resolve())
})

test('battery save is called', async () => {
  const json = { battery: join(batteryExample) }
  const guardianId = 'xyz'
  const checkinId = 'abc'
  const checkin = makeCheckin(json, guardianId, checkinId)

  await createDbSaveMeta(checkin)

  expect(saveMeta.Battery).toHaveBeenCalledWith(batteryExample, guardianId, checkinId)
})

test('battery save is called when abbreviated', async () => {
  const json = { btt: join(batteryExample) }
  const checkin = makeCheckin(json, 'xyz', 'abc')

  await createDbSaveMeta(checkin)

  expect(saveMeta.Battery).toHaveBeenCalledWith(batteryExample, expect.anything(), expect.anything())
})

test('battery save is called when invalid abbreviated but send empty list', async () => {
  const json = { b: join(batteryExample) }
  const checkin = makeCheckin(json, 'xyz', 'abc')

  await createDbSaveMeta(checkin)

  expect(saveMeta.Battery).toHaveBeenCalledWith(emptyList, expect.anything(), expect.anything())
})

test('cpu save is called', async () => {
  const json = { cpu: join(cpuExample) }
  const guardianId = 'xyz'
  const checkinId = 'abc'
  const checkin = makeCheckin(json, guardianId, checkinId)

  await createDbSaveMeta(checkin)

  expect(saveMeta.CPU).toHaveBeenCalledWith(cpuExample, guardianId, checkinId)
})

test('cpu save is called when abbreviated', async () => {
  const json = { c: join(cpuExample) }
  const checkin = makeCheckin(json, 'xyz', 'abc')

  await createDbSaveMeta(checkin)

  expect(saveMeta.CPU).toHaveBeenCalledWith(cpuExample, expect.anything(), expect.anything())
})

test('cpu save is called when invalid abbreviated but send empty list', async () => {
  const json = { cp: join(cpuExample) }
  const checkin = makeCheckin(json, 'xyz', 'abc')

  await createDbSaveMeta(checkin)

  expect(saveMeta.CPU).toHaveBeenCalledWith(emptyList, expect.anything(), expect.anything())
})

test('data transfer save is called', async () => {
  const json = { data_transfer: join(dataTransferExample) }
  const guardianId = 'xyz'
  const checkinId = 'abc'
  const checkin = makeCheckin(json, guardianId, checkinId)

  await createDbSaveMeta(checkin)

  expect(saveMeta.DataTransfer).toHaveBeenCalledWith(dataTransferExample, guardianId, checkinId)
})

test('data transfer save is called when abbreviated', async () => {
  const json = { dt: join(dataTransferExample) }
  const checkin = makeCheckin(json, 'xyz', 'abc')

  await createDbSaveMeta(checkin)

  expect(saveMeta.DataTransfer).toHaveBeenCalledWith(dataTransferExample, expect.anything(), expect.anything())
})

test('data transfer save is called when invalid abbreviated but send empty list', async () => {
  const json = { dtf: join(dataTransferExample) }
  const checkin = makeCheckin(json, 'xyz', 'abc')

  await createDbSaveMeta(checkin)

  expect(saveMeta.DataTransfer).toHaveBeenCalledWith(emptyList, expect.anything(), expect.anything())
})

test('network save is called', async () => {
  const json = { network: join(networkExample) }
  const guardianId = 'xyz'
  const checkinId = 'abc'
  const checkin = makeCheckin(json, guardianId, checkinId)

  await createDbSaveMeta(checkin)

  expect(saveMeta.Network).toHaveBeenCalledWith(networkExample, guardianId, checkinId)
})

test('network save is called when abbreviated', async () => {
  const json = { nw: join(networkExample) }
  const checkin = makeCheckin(json, 'xyz', 'abc')

  await createDbSaveMeta(checkin)

  expect(saveMeta.Network).toHaveBeenCalledWith(networkExample, expect.anything(), expect.anything())
})

test('network save is called when invalid abbreviated but send empty list', async () => {
  const json = { ntw: join(networkExample) }
  const checkin = makeCheckin(json, 'xyz', 'abc')

  await createDbSaveMeta(checkin)

  expect(saveMeta.Network).toHaveBeenCalledWith(emptyList, expect.anything(), expect.anything())
})

test('storage save is called', async () => {
  const json = { storage: join(storageExample) }
  const guardianId = 'xyz'
  const checkinId = 'abc'
  const checkin = makeCheckin(json, guardianId, checkinId)

  await createDbSaveMeta(checkin)

  expect(saveMeta.Storage).toHaveBeenCalledWith(storageExample, guardianId, checkinId)
})

test('storage save is called when abbreviated', async () => {
  const json = { str: join(storageExample) }
  const checkin = makeCheckin(json, 'xyz', 'abc')

  await createDbSaveMeta(checkin)

  expect(saveMeta.Storage).toHaveBeenCalledWith(storageExample, expect.anything(), expect.anything())
})

test('storage save is called when invalid abbreviated but send empty list', async () => {
  const json = { stg: join(storageExample) }
  const checkin = makeCheckin(json, 'xyz', 'abc')

  await createDbSaveMeta(checkin)

  expect(saveMeta.Storage).toHaveBeenCalledWith(emptyList, expect.anything(), expect.anything())
})

test('memory save is called', async () => {
  const json = { memory: join(memoryExample) }
  const guardianId = 'xyz'
  const checkinId = 'abc'
  const checkin = makeCheckin(json, guardianId, checkinId)

  await createDbSaveMeta(checkin)

  expect(saveMeta.Memory).toHaveBeenCalledWith(memoryExample, guardianId, checkinId)
})

test('memory save is called when abbreviated', async () => {
  const json = { mm: join(memoryExample) }
  const checkin = makeCheckin(json, 'xyz', 'abc')

  await createDbSaveMeta(checkin)

  expect(saveMeta.Memory).toHaveBeenCalledWith(memoryExample, expect.anything(), expect.anything())
})

test('memory save is called when invalid abbreviated but send empty list', async () => {
  const json = { mmr: join(memoryExample) }
  const checkin = makeCheckin(json, 'xyz', 'abc')

  await createDbSaveMeta(checkin)

  expect(saveMeta.Memory).toHaveBeenCalledWith(emptyList, expect.anything(), expect.anything())
})

test('broker connections save is called', async () => {
  const json = { broker_connections: join(brokerConnectionExample) }
  const guardianId = 'xyz'
  const checkinId = 'abc'
  const checkin = makeCheckin(json, guardianId, checkinId)

  await createDbSaveMeta(checkin)

  expect(saveMeta.MqttBrokerConnection).toHaveBeenCalledWith(brokerConnectionExample, guardianId, checkinId)
})

test('broker connections save is called when abbreviated', async () => {
  const json = { bc: join(brokerConnectionExample) }
  const checkin = makeCheckin(json, 'xyz', 'abc')

  await createDbSaveMeta(checkin)

  expect(saveMeta.MqttBrokerConnection).toHaveBeenCalledWith(brokerConnectionExample, expect.anything(), expect.anything())
})

test('broker connections save is called when invalid abbreviated but send empty list', async () => {
  const json = { bkc: join(brokerConnectionExample) }
  const checkin = makeCheckin(json, 'xyz', 'abc')

  await createDbSaveMeta(checkin)

  expect(saveMeta.MqttBrokerConnection).toHaveBeenCalledWith(emptyList, expect.anything(), expect.anything())
})

test('detections save is called', async () => {
  const joinDetections = join(detectionExample)
  const json = { detections: joinDetections }
  const guardianId = 'xyz'
  const checkinId = 'abc'
  const streamId = 'hjk'
  const checkin = makeCheckin(json, guardianId, checkinId, streamId)

  await createDbSaveMeta(checkin)

  expect(saveMeta.Detections).toHaveBeenCalledWith(joinDetections.split('|'), streamId)
})

test('detections save is called when abbreviated', async () => {
  const joinDetections = join(detectionExample)
  const json = { dtt: joinDetections }
  const checkin = makeCheckin(json, 'xyz', 'abc', 'hjk')

  await createDbSaveMeta(checkin)

  expect(saveMeta.Detections).toHaveBeenCalledWith(joinDetections.split('|'), expect.anything())
})

test('detections save is called when invalid abbreviated but send empty list', async () => {
  const joinDetections = join(detectionExample)
  const json = { dtts: joinDetections }
  const checkin = makeCheckin(json, 'xyz', 'abc', 'hjk')

  await createDbSaveMeta(checkin)

  expect(saveMeta.Detections).toHaveBeenCalledWith(emptyList, expect.anything())
})

test('software role save is called', async () => {
  const json = { software: join(softwareRoleExample) }
  const guardianId = 'xyz'
  const checkinId = 'abc'
  const checkin = makeCheckin(json, guardianId, checkinId)

  await createDbSaveMeta(checkin)

  expect(saveMeta.SoftwareRoleVersion).toHaveBeenCalledWith(softwareRoleExample, guardianId)
})

test('software role save is called when abbreviated', async () => {
  const json = { sw: join(softwareRoleExample) }
  const checkin = makeCheckin(json, 'xyz', 'abc')

  await createDbSaveMeta(checkin)

  expect(saveMeta.SoftwareRoleVersion).toHaveBeenCalledWith(softwareRoleExample, expect.anything())
})

test('software role save is called when invalid abbreviated but send empty list', async () => {
  const json = { sws: join(softwareRoleExample) }
  const checkin = makeCheckin(json, 'xyz', 'abc')

  await createDbSaveMeta(checkin)

  expect(saveMeta.SoftwareRoleVersion).toHaveBeenCalledWith(emptyList, expect.anything())
})

test('checkins save is called', async () => {
  const measuredAt = 1234567891011
  const json = { checkins: join(checkinsExample), measured_at: measuredAt }
  const guardianId = 'xyz'
  const checkinId = 'abc'
  const checkin = makeCheckin(json, guardianId, checkinId)

  await createDbSaveMeta(checkin)

  expect(saveMeta.CheckInStatus).toHaveBeenCalledWith(checkinsExample, guardianId, measuredAt)
})

test('checkins save is called when abbreviated', async () => {
  const json = { chn: join(checkinsExample), ma: 1234567891011 }
  const checkin = makeCheckin(json, 'xyz', 'abc')

  await createDbSaveMeta(checkin)

  expect(saveMeta.CheckInStatus).toHaveBeenCalledWith(checkinsExample, expect.anything(), expect.anything())
})

test('checkins save is called when invalid abbreviated but send empty list', async () => {
  const json = { chns: join(checkinsExample), ma: 1234567891011 }
  const checkin = makeCheckin(json, 'xyz', 'abc')

  await createDbSaveMeta(checkin)

  expect(saveMeta.CheckInStatus).toHaveBeenCalledWith(emptyList, expect.anything(), expect.anything())
})

test('sentinel power save is called', async () => {
  const json = { sentinel_power: join(sentinelPowerExample) }
  const guardianId = 'xyz'
  const checkinId = 'abc'
  const checkin = makeCheckin(json, guardianId, checkinId)

  await createDbSaveMeta(checkin)

  expect(saveMeta.SentinelPower).toHaveBeenCalledWith(sentinelPowerExample, guardianId, checkinId)
})

test('sentinel power save is called when abbreviated', async () => {
  const json = { sp: join(sentinelPowerExample) }
  const checkin = makeCheckin(json, 'xyz', 'abc')

  await createDbSaveMeta(checkin)

  expect(saveMeta.SentinelPower).toHaveBeenCalledWith(sentinelPowerExample, expect.anything(), expect.anything())
})

test('sentinel power save is called when invalid abbreviated but send empty list', async () => {
  const json = { stp: join(sentinelPowerExample) }
  const checkin = makeCheckin(json, 'xyz', 'abc')

  await createDbSaveMeta(checkin)

  expect(saveMeta.SentinelPower).toHaveBeenCalledWith(emptyList, expect.anything(), expect.anything())
})

test('device save is called', async () => {
  const json = { device: deviceExample }
  const guardianId = 'xyz'
  const checkinId = 'abc'
  const checkin = makeCheckin(json, guardianId, checkinId)

  await createDbSaveMeta(checkin)

  expect(saveMeta.Device).toHaveBeenCalledWith(deviceExample, guardianId)
})

test('device save is called when abbreviated', async () => {
  const json = { dv: deviceExample }
  const checkin = makeCheckin(json, 'xyz', 'abc')

  await createDbSaveMeta(checkin)

  expect(saveMeta.Device).toHaveBeenCalledWith(deviceExample, expect.anything())
})

test('device save is called when invalid abbreviated but send empty list', async () => {
  const json = { dvc: deviceExample }
  const checkin = makeCheckin(json, 'xyz', 'abc')

  await createDbSaveMeta(checkin)

  expect(saveMeta.Device).toHaveBeenCalledWith(emptyObj, expect.anything())
})

test('swarm save is called', async () => {
  const json = { swm: join(swarmExample) }
  const guardianId = 'xyz'
  const checkinId = 'abc'
  const checkin = makeCheckin(json, guardianId, checkinId)

  await createDbSaveMeta(checkin)

  expect(saveMeta.SwarmDiagnostics).toHaveBeenCalledWith(swarmExample, guardianId, checkinId)
})

const emptyList = []

const emptyObj = {}

const batteryExample = [
  ['1639990754314', '100', '25', '0', '1'],
  ['1639990558385', '100', '25', '0', '1']
]
const cpuExample = [
  ['1639990677555', '24', '424', '200'],
  ['1639990558292', '24', '354', '200']
]

const dataTransferExample = [
  ['1639662436136', '1639662614136', '0', '0', '490602', '9344564'],
  ['1639662257911', '1639662436136', '0', '0', '490602', '9344564']
]

const networkExample = [
  ['1639662807479', '-91', 'hspa', 'AT&T'],
  ['1639661726813', '-91', 'hspa', 'AT&T']
]

const storageExample = [
  ['i', '1639662807198', '287502336', '1077907456'],
  ['e', '1639662807198', '396197888', '127436980224']
]

const memoryExample = [
  ['system', '1639986182572', '309223424', '172429312', '57702400'],
  ['system', '1639986003785', '309149696', '172503040', '57702400']
]

const brokerConnectionExample = [
  ['1639986160114', '29953', '455', 'ssl://api-mqtt.rfcx.org:8883'],
  ['1639985978216', '9280', '476', 'ssl://api-mqtt.rfcx.org:8883']
]

const detectionExample = [
  ['chainsaw', 'chainsaw-v5', '1637772067416*975000', ',,,0.97,,,0.97,,0.99,0.99,0.99,,0.96,,,,,,,,,,,0.97,,,,,0.96,,,,,,,,0.96,,,,,,,,,0.97,,,,,0.99,,,0.99,0.98,,0.97,0.99,,0.98,,,0.97,,0.99,0.98,,,,,,,,,,,,,,,,,,,,,,,,,,'],
  ['chainsaw', 'chainsaw-v5', '1637770716128*975000', ',,,,,,,,,,,,,,,,,0.98,,,,,,,,,,,,,,,,,,,,0.99,,,,,,,,,,,,,,,,,0.98,,,,,,,,,,,,,,0.99,,0.98,,,,,,,,,0.98,,,0.97,,,,,,,,0.96,,']
]

const softwareRoleExample = [
  ['guardian', '0.8.9'],
  ['admin', '0.8.8'],
  ['classify', '0.8.3']
]

const checkinsExample = [
  ['s', '0', '0'],
  ['q', '602', '83754671']
]

const sentinelPowerExample = [
  ['s', '1639989299200', '8972', '90', '30', '783'],
  ['i', '1639989299200', '9008', '80', '8', '718'],
  ['b', '1639989299200', '3363', '-20', '100.00', '-65']
]

const swarmExample = [
  ['1420070745567', '-101', '-95', '7', '11', '2021-09-30 10:10:10', '0x1234AB', '5'],
  ['1420070745999', '-101', '-95', '7', '11', '2021-09-30 10:10:10', '0x1234AB', '5']
]

const deviceExample = {
  android: {
    product: 'Guardian',
    brand: 'RFCx',
    model: '3G_IOT',
    build: '0.2.3',
    android: '4.4.2',
    manufacturer: 'OrangePi'
  },
  phone: {
    sim: '8901260295780250462f',
    number: '14156300572',
    imei: '358877840010416',
    imsi: '310260298025046'
  },
  hardware: {
    product: 'Guardian',
    brand: 'RFCx',
    model: '3G_IOT',
    build: '0.2.3',
    android: '4.4.2',
    manufacturer: 'OrangePi'
  }
}

function join (arrayOfArray) {
  return arrayOfArray.map(array => array.join('*')).join('|')
}

function makeCheckin (json, guardianId, checkinId, streamId) {
  return expandAbbreviatedFieldNames({
    db: {
      dbGuardian: {
        id: guardianId,
        stream_id: streamId
      },
      dbCheckIn: {
        id: checkinId
      }
    },
    json
  })
}

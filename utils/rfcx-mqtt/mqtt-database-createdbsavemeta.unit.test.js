const { checkInDatabase: { createDbSaveMeta } } = require('./mqtt-database')
const { saveMeta } = require('./mqtt-save-meta')

jest.mock('./mqtt-save-meta')

beforeEach(() => {
  saveMeta.CPU = jest.fn().mockImplementation(() => Promise.resolve())
  saveMeta.Battery = jest.fn().mockImplementation(() => Promise.resolve())
  saveMeta.DataTransfer = jest.fn().mockImplementation(() => Promise.resolve())
  saveMeta.Network = jest.fn().mockImplementation(() => Promise.resolve())
  saveMeta.Storage = jest.fn().mockImplementation(() => Promise.resolve())
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

test('data transfer save is called when abbreviated but send empty list', async () => {
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

test('network save is called when abbreviated but send empty list', async () => {
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

test('storage save is called when abbreviated but send empty list', async () => {
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

test('memory save is called when abbreviated but send empty list', async () => {
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

test('broker connections save is called when abbreviated but send empty list', async () => {
  const json = { bkc: join(brokerConnectionExample) }
  const checkin = makeCheckin(json, 'xyz', 'abc')

  await createDbSaveMeta(checkin)

  expect(saveMeta.MqttBrokerConnection).toHaveBeenCalledWith(emptyList, expect.anything(), expect.anything())
})

const emptyList = []

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

function join (arrayOfArray) {
  return arrayOfArray.map(array => array.join('*')).join('|')
}

function makeCheckin (json, guardianId, checkinId) {
  return {
    db: {
      dbGuardian: {
        id: guardianId
      },
      dbCheckIn: {
        id: checkinId
      }
    },
    json
  }
}

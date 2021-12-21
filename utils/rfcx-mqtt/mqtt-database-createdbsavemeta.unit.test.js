const { checkInDatabase: { createDbSaveMeta } } = require('./mqtt-database')
const { saveMeta } = require('./mqtt-save-meta')

jest.mock('./mqtt-save-meta')

beforeEach(() => {
  saveMeta.CPU = jest.fn().mockImplementation(() => Promise.resolve())
  saveMeta.Battery = jest.fn().mockImplementation(() => Promise.resolve())
  saveMeta.DataTransfer = jest.fn().mockImplementation(() => Promise.resolve())
  saveMeta.Network = jest.fn().mockImplementation(() => Promise.resolve())
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

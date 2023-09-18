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

const { saveMeta: { Device } } = require('./mqtt-save-meta')
const models = require('../../_models')

jest.mock('../../_models', () => {
  const devices = []
  return {
    GuardianMetaHardware: {
      findAll: () => Promise.resolve(devices),
      findOrCreate: (options) => {
        let device = devices.find(d => d.guardian_id === options.where.guardian_id)
        const hasInserted = device === undefined
        if (hasInserted) {
          device = options.where
          device.save = () => Promise.resolve()
          devices.push(device)
        }
        return Promise.resolve([device, hasInserted])
      }
    },
    reset: () => {
      while (devices.length) {
        devices.pop()
      }
    }
  }
})

beforeEach(async () => {
  await models.reset()
})

test('new device meta is saved', async () => {
  const payload = {
    android: {
      product: 'Guardian',
      brand: 'RFCx',
      model: '3G_IOT',
      build: '0.2.3',
      android: '4.4.2',
      manufacturer: 'OrangePi'
    },
    phone: {
      carrier: 'AIS',
      sim: '8901260295780250462f',
      number: '14156300572',
      imei: '358877840010416',
      imsi: '310260298025046'
    }
  }

  await Device(payload, 'xyz')

  const results = await models.GuardianMetaHardware.findAll()
  expect(results.length).toBe(1)
  expect(results[0].manufacturer).toEqual(payload.android.manufacturer)
  expect(results[0].product).toEqual(payload.android.product)
  expect(results[0].brand).toEqual(payload.android.brand)
  expect(results[0].model).toEqual(payload.android.model)
  expect(results[0].android_build).toEqual(payload.android.build)
  expect(results[0].android_version).toEqual(payload.android.android)
  expect(results[0].phone_sim_carrier).toEqual(payload.phone.carrier)
  expect(results[0].phone_sim_serial).toEqual(payload.phone.sim)
  expect(results[0].phone_sim_number).toEqual(payload.phone.number)
  expect(results[0].phone_imei).toEqual(payload.phone.imei)
  expect(results[0].phone_imsi).toEqual(payload.phone.imsi)
})

test('phone meta is updated', async () => {
  const existingDevice = {
    android: {
      product: 'Guardian',
      brand: 'RFCx',
      model: '3G_IOT',
      build: '0.2.3',
      android: '4.4.2',
      manufacturer: 'OrangePi'
    },
    phone: {
      carrier: 'AIS',
      sim: '8901260295780250462f',
      number: '14156300572',
      imei: '358877840010416',
      imsi: '310260298025046'
    }
  }
  await Device(existingDevice, 'xyz')
  const payload = {
    phone: {
      carrier: 'True',
      sim: '55555502957802555555',
      number: '12345678901',
      imei: '358999999999999',
      imsi: '310888888888888'
    }
  }

  await Device(payload, 'xyz')

  const results = await models.GuardianMetaHardware.findAll()
  expect(results.length).toBe(1)
  expect(results[0].manufacturer).toEqual(existingDevice.android.manufacturer)
  expect(results[0].product).toEqual(existingDevice.android.product)
  expect(results[0].brand).toEqual(existingDevice.android.brand)
  expect(results[0].model).toEqual(existingDevice.android.model)
  expect(results[0].android_build).toEqual(existingDevice.android.build)
  expect(results[0].android_version).toEqual(existingDevice.android.android)
  expect(results[0].phone_sim_carrier).toEqual(payload.phone.carrier)
  expect(results[0].phone_sim_serial).toEqual(payload.phone.sim)
  expect(results[0].phone_sim_number).toEqual(payload.phone.number)
  expect(results[0].phone_imei).toEqual(payload.phone.imei)
  expect(results[0].phone_imsi).toEqual(payload.phone.imsi)
})

test('new device meta (compact format) is saved', async () => {
  const payload = {
    a: {
      p: 'Guardian',
      br: 'RFCx',
      m: '3G_IOT',
      bu: '0.2.3',
      a: '4.4.2',
      mf: 'OrangePi'
    },
    p: {
      s: '8901260295780250462f',
      n: '14156300572',
      imei: '358877840010416',
      imsi: '310260298025046'
    }
  }

  await Device(payload, 'xyz')

  const results = await models.GuardianMetaHardware.findAll()

  expect(results.length).toBe(1)
  expect(results[0].manufacturer).toEqual(payload.a.mf)
  expect(results[0].product).toEqual(payload.a.p)
  expect(results[0].brand).toEqual(payload.a.br)
  expect(results[0].model).toEqual(payload.a.m)
  expect(results[0].android_build).toEqual(payload.a.bu)
  expect(results[0].android_version).toEqual(payload.a.a)
  expect(results[0].phone_sim_serial).toEqual(payload.p.s)
  expect(results[0].phone_sim_number).toEqual(payload.p.n)
  expect(results[0].phone_imei).toEqual(payload.p.imei)
  expect(results[0].phone_imsi).toEqual(payload.p.imsi)
})

test('shorten device invalid', async () => {
  const payload = {
    a: {
      p: 'Guardian',
      br: 'RFCx',
      m: '3G_IOT',
      bu: '0.2.3',
      a: '4.4.2',
      mf: 'OrangePi'
    },
    pa: {
      s: '8901260295780250462f',
      n: '14156300572',
      imei: '358877840010416',
      imsi: '310260298025046'
    }
  }

  await Device(payload, 'xyz')

  const results = await models.GuardianMetaHardware.findAll()

  expect(results.length).toBe(1)
  expect(results[0].manufacturer).toEqual(payload.a.mf)
  expect(results[0].product).toEqual(payload.a.p)
  expect(results[0].brand).toEqual(payload.a.br)
  expect(results[0].model).toEqual(payload.a.m)
  expect(results[0].android_build).toEqual(payload.a.bu)
  expect(results[0].android_version).toEqual(payload.a.a)
  expect(results[0].phone_sim_serial).toBeUndefined()
  expect(results[0].phone_sim_number).toBeUndefined()
  expect(results[0].phone_imei).toBeUndefined()
  expect(results[0].phone_imsi).toBeUndefined()
})

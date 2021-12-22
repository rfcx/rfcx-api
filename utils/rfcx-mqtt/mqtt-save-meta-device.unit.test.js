const { saveMeta: { Device } } = require('./mqtt-save-meta')
const models = require('../../models')

jest.mock('../../models', () => {
  const devicePayload = {
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
    }
  }
  const device = []
  return {
    GuardianMetaHardware: {
      findAll: () => Promise.resolve(device),
      findOrCreate: () => {
        device.push(devicePayload)
        return Promise.resolve([{ ...devicePayload, save: () => Promise.resolve() }, true])
      }
    },
    reset: () => {
      while (device.length) {
        device.pop()
      }
    }
  }
})

beforeEach(async () => {
  await models.reset()
})

test('normal device', async () => {
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
      sim: '8901260295780250462f',
      number: '14156300572',
      imei: '358877840010416',
      imsi: '310260298025046'
    }
  }

  await Device(payload, 'xyz')

  const results = await models.GuardianMetaHardware.findAll()
  expect(results.length).toBe(1)
})

test('shorten device', async () => {
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

  console.log(results)
  expect(results.length).toBe(1)
})

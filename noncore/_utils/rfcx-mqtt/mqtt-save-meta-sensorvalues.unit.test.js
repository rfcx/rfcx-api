const moment = require('moment')
const { saveMeta: { SensorValues } } = require('./mqtt-save-meta')
const models = require('../../_models')

jest.mock('../../_models', () => {
  const sensorValues = []
  const sensors = []
  const sensorComponents = []
  return {
    GuardianMetaSensorValue: {
      findAll: () => Promise.resolve(sensorValues),
      bulkCreate: (objects) => {
        sensorValues.push(...objects)
        return Promise.resolve()
      }
    },
    GuardianMetaSensor: {
      findAll: () => Promise.resolve(sensors),
      findOrCreate: (options) => {
        let sensor = sensors.find(c => c.component_id === options.where.component_id && c.payload_position === options.where.payload_position)
        let wasInserted = false
        if (sensor === undefined) {
          sensor = options.where
          sensors.push(sensor)
          wasInserted = true
        }
        return Promise.resolve([{ ...sensor, save: () => Promise.resolve() }, wasInserted])
      }
    },
    GuardianMetaSensorComponent: {
      findAll: () => Promise.resolve(sensorComponents),
      findOrCreate: (options) => {
        let sensorComponent = sensorComponents.find(c => c.shortname === options.where.shortname)
        let wasInserted = false
        if (sensorComponent === undefined) {
          sensorComponent = options.where
          sensorComponents.push(sensorComponent)
          wasInserted = true
        }
        return Promise.resolve([{ ...sensorComponent, save: () => Promise.resolve() }, wasInserted])
      }
    },
    reset: () => {
      while (sensorValues.length) {
        sensorValues.pop()
      }
      while (sensors.length) {
        sensors.pop()
      }
      while (sensorComponents.length) {
        sensorComponents.pop()
      }
    }
  }
})

beforeEach(async () => {
  await models.reset()
})

test('can create a new sensor component', async () => {
  const timestamp = moment.utc()
  const payloadAsArray = [
    { component: 'ab', timestamp, values: [12.345, 6.789, 0.12345] }
  ]

  await SensorValues(payloadAsArray, 'xyz')

  const results = await models.GuardianMetaSensorComponent.findAll()
  expect(results).toHaveLength(1)
  expect(results[0].shortname).toBe(payloadAsArray[0].component)
})

test('can create a new sensor', async () => {
  const timestamp = moment.utc()
  const payloadAsArray = [
    { component: 'ab', timestamp, values: [12.345, 6.789, 0.12345] }
  ]

  await SensorValues(payloadAsArray, 'xyz')

  const results = await models.GuardianMetaSensor.findAll()
  expect(results).toHaveLength(3)
  expect(results.map(s => s.payload_position)).toEqual([0, 1, 2])
})

test('can save sensor values', async () => {
  const timestamp = moment.utc()
  const payloadAsArray = [
    { component: 'ab', timestamp, values: [12.345, 6.789, 0.12345] }
  ]

  await SensorValues(payloadAsArray, 'xyz')

  const results = await models.GuardianMetaSensorValue.findAll()
  expect(results.length).toBe(3)

  results.forEach((it, index) => {
    expect(it.measured_at).toEqual(timestamp.toDate())
    expect(it.value).toBe(payloadAsArray[0].values[index])
  })
})

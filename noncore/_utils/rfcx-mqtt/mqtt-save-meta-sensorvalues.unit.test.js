jest.mock('../../_models', () => { return {} })
jest.mock('../../../core/_models', () => {
  return {
    ClassifierDeployment: { attributes: {} },
    ClassifierOutput: { attributes: {} },
    User: { attributes: {} },
    Stream: { attributes: {} },
    Project: { attributes: {} }
  }
})

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
          sensor.id = sensors.length === 0 ? 1 : (sensors[sensors.length - 1].id + 1)
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
          sensorComponent.id = sensorComponents.length === 0 ? 1 : (sensorComponents[sensorComponents.length - 1].id + 1)
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
  const payloadArray = [
    { component: 'ab', timestamp, values: [12.345, 6.789, 0.12345] }
  ]

  await SensorValues(payloadArray, 'xyz')

  const results = await models.GuardianMetaSensorComponent.findAll()
  expect(results).toHaveLength(1)
  expect(results[0].shortname).toBe(payloadArray[0].component)
})

test('can create a new sensor', async () => {
  const timestamp = moment.utc()
  const payloadArray = [
    { component: 'ab', timestamp, values: [12.345, 6.789, 0.12345] }
  ]

  await SensorValues(payloadArray, 'xyz')

  const results = await models.GuardianMetaSensor.findAll()
  expect(results).toHaveLength(3)
  expect(results.map(s => s.payload_position)).toEqual([0, 1, 2])
})

test('can save sensor values', async () => {
  const timestamp = moment.utc()
  const payloadArray = [
    { component: 'ab', timestamp, values: [12.345, 6.789, 0.12345] }
  ]

  await SensorValues(payloadArray, 'xyz')

  const results = await models.GuardianMetaSensorValue.findAll()
  expect(results.length).toBe(3)
  results.forEach((it, index) => {
    expect(moment(it.measured_at).toDate()).toEqual(timestamp.toDate())
    expect(it.value).toBe(payloadArray[0].values[index])
  })
})

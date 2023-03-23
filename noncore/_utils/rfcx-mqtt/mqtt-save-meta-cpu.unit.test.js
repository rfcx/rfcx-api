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
const { saveMeta: { CPU } } = require('./mqtt-save-meta')
const models = require('../../_models')

jest.mock('../../_models', () => {
  const cpu = []
  return {
    GuardianMetaCPU: {
      findAll: () => Promise.resolve(cpu),
      bulkCreate: (objects) => {
        cpu.push(...objects)
        return Promise.resolve()
      }
    },
    reset: () => {
      while (cpu.length) {
        cpu.pop()
      }
    }
  }
})

beforeEach(async () => {
  await models.reset()
})

test('can save cpu meta', async () => {
  const payloadAsArray = [
    ['1639990677555', '24', '424', '200'],
    ['1639990558292', '24', '354', '200'],
    ['1639990618092', '18', '251', '200']]

  await CPU(payloadAsArray, 'xyz', '123')

  const results = await models.GuardianMetaCPU.findAll()
  expect(results.length).toBe(3)

  payloadAsArray.forEach((it, index) => {
    expect(results[index].measured_at).toEqual(moment(parseInt(it[0])).toDate())
    expect(results[index].cpu_percent).toBe(parseInt(it[1]))
    expect(results[index].cpu_clock).toBe(parseInt(it[2]))
  })
})

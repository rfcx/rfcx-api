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
const { saveMeta: { DataTransfer } } = require('./mqtt-save-meta')
const models = require('../../_models')

jest.mock('../../_models', () => {
  const dataTransfer = []
  return {
    GuardianMetaDataTransfer: {
      findAll: () => Promise.resolve(dataTransfer),
      bulkCreate: (objects) => {
        dataTransfer.push(...objects)
        return Promise.resolve()
      }
    },
    reset: () => {
      while (dataTransfer.length) {
        dataTransfer.pop()
      }
    }
  }
})

beforeEach(async () => {
  await models.reset()
})

test('can save data transfer meta', async () => {
  const payloadAsArray = [
    ['1639662436136', '1639662614136', '0', '0', '490602', '9344564'],
    ['1639662257911', '1639662436136', '0', '0', '490602', '9344564'],
    ['1639662079919', '1639662257911', '0', '0', '490602', '9344564'],
    ['1639661901896', '1639662079919', '0', '0', '490602', '9344564'],
    ['1639661723676', '1639661901896', '0', '0', '490602', '9344564'],
    ['1639661545671', '1639661723676', '0', '0', '490602', '9344564'],
    ['1639661367657', '1639661545671', '0', '0', '490602', '9344564'],
    ['1639661189492', '1639661367657', '0', '0', '490602', '9344564']]

  await DataTransfer(payloadAsArray, 'xyz', '123')

  const results = await models.GuardianMetaDataTransfer.findAll()
  expect(results.length).toBe(8)

  payloadAsArray.forEach((it, index) => {
    expect(results[index].started_at).toEqual(moment(parseInt(it[0])).toDate())
    expect(results[index].ended_at).toEqual(moment(parseInt(it[1])).toDate())
    expect(results[index].mobile_bytes_received).toBe(parseInt(it[2]))
    expect(results[index].mobile_bytes_sent).toBe(parseInt(it[3]))
    expect(results[index].mobile_total_bytes_received).toBe(parseInt(it[4]))
    expect(results[index].mobile_total_bytes_sent).toBe(parseInt(it[5]))
  })
})

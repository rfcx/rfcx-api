const request = require('supertest')
const routes = require('.')
const model = require('../../_models')
const { EmptyResultError } = require('../../../common/error-handling/errors')
const { expressApp, muteConsole } = require('../../../common/testing/sequelize')

const app = expressApp()

app.use('/', routes)

const streamIdCell = 'abc123'
const streamIdSatellite = 'def456'
const streamIdUnknown = 'ghi789'
const data = {
  [streamIdCell]: { guardianId: 23, deployedAt: '2022-02-16T10:30:05.000Z', prefValue: 'mqtt,rest' },
  [streamIdSatellite]: { guardianId: 56, deployedAt: '2022-02-17T11:45:35.000Z', prefValue: 'sat' },
  [streamIdUnknown]: { guardianId: 89, deployedAt: null }
}

beforeEach(() => {
  model.Guardian.findOne = jest.fn().mockImplementation(({ where }) => {
    const item = data[where.stream_id]
    if (!item) { return Promise.reject(new EmptyResultError()) }
    return Promise.resolve({ id: item.guardianId, deployed_at: item.deployedAt })
  })
  model.GuardianSoftwarePrefs.findOne = jest.fn().mockImplementation(({ where }) => {
    const item = Object.values(data).find(row => row.guardianId === where.guardian_id)
    if (!item || !item.prefValue || where.pref_key !== 'api_protocol_escalation_order') {
      return Promise.resolve(null)
    }
    return { pref_key: 'api_protocol_escalation_order', pref_value: item.prefValue }
  })
})

test('guardian not found', async () => {
  muteConsole('warn')
  const response = await request(app).get('/n0t4Gu4r6')

  expect(response.statusCode).toBe(404)
})

test('cell guardian type returned', async () => {
  const response = await request(app).get(`/${streamIdCell}`)

  expect(response.statusCode).toBe(200)
  expect(response.body.type).toBe('cell')
})

test('satellite guardian type returned', async () => {
  const response = await request(app).get(`/${streamIdSatellite}`)

  expect(response.statusCode).toBe(200)
  expect(response.body.type).toBe('satellite')
})

test('unknown guardian type returned', async () => {
  const response = await request(app).get(`/${streamIdUnknown}`)

  expect(response.statusCode).toBe(200)
  expect(response.body.type).toBe('unknown')
})

test('date returned for deployed guardian', async () => {
  const response = await request(app).get(`/${streamIdSatellite}`)

  expect(response.statusCode).toBe(200)
  expect(response.body.deployed_at).toEqual(data[streamIdSatellite].deployedAt)
})

test('not yet deployed guardian', async () => {
  const response = await request(app).get(`/${streamIdUnknown}`)

  expect(response.statusCode).toBe(200)
  expect(response.body.deployed_at).toBeNull()
})

describe('GET /streams', () => {
  test('no results', async () => {
    const response = await request(app).get('/')

    expect(response.statusCode).toBe(500)
  })
})

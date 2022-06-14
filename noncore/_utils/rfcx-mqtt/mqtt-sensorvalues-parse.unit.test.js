const { parse } = require('./mqtt-sensorvalues-parse')
const { ValidationError } = require('../../../common/error-handling/errors')

test('throw on missing data and wrong type data', () => {
  expect(() => parse('bm*1420080073642')).toThrow(ValidationError)
  expect(() => parse('bm*1420080073642*')).toThrow(ValidationError)
  expect(() => parse('bm*1420080073642*998.3*')).toThrow(ValidationError)
  expect(() => parse('bm*')).toThrow(ValidationError)
  expect(() => parse('bm')).toThrow(ValidationError)
  expect(() => parse('bm*998.3*41.11*31.02*39825.76')).toThrow(ValidationError)
  expect(() => parse('*1420080073642*998.3*41.11*31.02*39825.76')).toThrow(ValidationError)
  expect(() => parse('1420080073642*998.3*41.11*31.02*39825.76')).toThrow(ValidationError)
  expect(() => parse('ifn')).toThrow(ValidationError)
  expect(() => parse('ifn*')).toThrow(ValidationError)
  expect(() => parse('ifn*1420080073642')).toThrow(ValidationError)
  expect(() => parse('ifn*1420080073642*')).toThrow(ValidationError)
  expect(() => parse('ifn*1420080073642*998*')).toThrow(ValidationError)
})

test('parse bme688 sensor', () => {
  const raw = 'bm*1420080073642*998.3*41.11*31.02*39825.76'

  const result = parse(raw)

  expect(result.component).toBe('bm')
  expect(result.timestamp.toISOString()).toBe('2015-01-01T02:41:13.642Z')
  expect(result.values).toHaveLength(4)
  expect(result.values[0]).toEqual(expect.any(Number))
  expect(result.values[0]).toBe(998.3)
  expect(result.values[1]).toBe(41.11)
  expect(result.values[2]).toBe(31.02)
  expect(result.values[3]).toBe(39825.76)
})

test('parse with long decimal places', () => {
  const raw = '|bm*1420080142843*997.123456*41.987654*30.97531*39828.11111'

  const result = parse(raw)

  expect(result.values).toHaveLength(4)
  expect(result.values[0]).toBe(997.123456)
  expect(result.values[1]).toBe(41.987654)
  expect(result.values[2]).toBe(30.97531)
  expect(result.values[3]).toBe(39828.11111)
})

test('parse ifn sensor', () => {
  const raw = 'ifn*1420080073642*998'

  const result = parse(raw)

  expect(result.component).toBe('ifn')
  expect(result.timestamp.toISOString()).toBe('2015-01-01T02:41:13.642Z')
  expect(result.values).toHaveLength(1)
  expect(result.values[0]).toEqual(expect.any(Number))
  expect(result.values[0]).toBe(998)
})

test('parse ifn with long decimal places', () => {
  const raw = '|ifn*1420080073642*998.0001'

  const result = parse(raw)

  expect(result.values).toHaveLength(1)
  expect(result.values[0]).toBe(998.0001)
})

const { parse } = require('./mqtt-detections-parse')
const ValidationError = require('../../../utils/converter/validation-error')
const moment = require('moment')

test('throw on missing data and wrong type data', () => {
  expect(() => parse('*b*1420070745567*1000*0.9,0.9')).toThrow(ValidationError)
  expect(() => parse('a**1420070745567*1000*0.9,0.9')).toThrow(ValidationError)
  expect(() => parse('a*b**1000*0.9,0.9')).toThrow(ValidationError)
  expect(() => parse('a*b*xxx*1000*0.9,0.9')).toThrow(ValidationError)
  expect(() => parse('a*b*1420070745567**0.9,0.9')).toThrow(ValidationError)
  expect(() => parse('a*b*1420070745567*xxx*0.9,0.9')).toThrow(ValidationError)
  expect(() => parse('ab*1420070745567*1000*0.9,0.9')).toThrow(ValidationError)
  expect(() => parse('a*b*1420070745567*1000*')).toThrow(ValidationError)
  expect(() => parse('a*b*1420070745567*1000*xxx')).toThrow(ValidationError)
})

test('parse two', () => {
  const raw = 'chainsaw*chainsaw-v5*1420070745567*1000*0.98,0.96'

  const result = parse(raw)

  expect(result.length).toBe(2)
  expect(result[0].classification).toBe('chainsaw')
  expect(result[0].classifier).toBe('chainsaw-v5')
  expect(result[0].start.toISOString()).toBe('2015-01-01T00:05:45.567Z')
  expect(result[0].end.toISOString()).toBe('2015-01-01T00:05:46.567Z')
  expect(result[0].confidence).toBe(0.98)
  expect(result[1].classification).toBe('chainsaw')
  expect(result[1].classifier).toBe('chainsaw-v5')
  expect(result[1].start.toISOString()).toBe('2015-01-01T00:05:46.567Z')
  expect(result[1].end.toISOString()).toBe('2015-01-01T00:05:47.567Z')
  expect(result[1].confidence).toBe(0.96)
})

test('parse one with offset', () => {
  const raw = 'chainsaw*chainsaw-v5*1420070745567*1000*,0.96'

  const result = parse(raw)

  expect(result.length).toBe(1)
  expect(result[0].classification).toBe('chainsaw')
  expect(result[0].classifier).toBe('chainsaw-v5')
  expect(result[0].start.toISOString()).toBe('2015-01-01T00:05:46.567Z')
  expect(result[0].end.toISOString()).toBe('2015-01-01T00:05:47.567Z')
  expect(result[0].confidence).toBe(0.96)
})

test('success with multiple detections', () => {
  const raw = 'chainsaw*chainsaw-v5*1420070745567*1000*,,,,,,,,,,,,,,,,,,,,,,,,,0.98,,,,,,,,,,,,0.98,,,,0.95,,,,,,,,,,,0.90,,,,,0.97,,,,,,,,,,0.96,,,,,,,,,,,,,,,,,,,,,,,,,,'

  const result = parse(raw)

  expect(result.length).toBe(6)
})

test('success with multiple detections (compact format)', () => {
  const raw = 'chainsaw*chainsaw-v5*1420070745567*1000*n3,0.98,n11,0.98,n3,0.95,n10,0.90,n4,0.97,n9,0.96,n26'

  const result = parse(raw)

  expect(result.length).toBe(6)
  expect(result[0].start.toISOString()).toBe('2015-01-01T00:05:48.567Z')
  expect(result[1].start.toISOString()).toBe('2015-01-01T00:06:00.567Z')
})

test('success with multiple detections (compact format) and empty string', () => {
  const raw = 'chainsaw*chainsaw-v5*1420070745567*1000*n25,,,0.98,,0.98,n11,0.98,n3,0.95,n10,,,,0.90,n4,0.97,n9,,,0.96,n26'

  const result = parse(raw)

  expect(result.length).toBe(7)
})

test('incorrect step (from tembe guardians)', () => {
  const raw = 'chainsaw*chainsaw-v5*1619211870411*975000*,,,,,,,,,0.99,,,,,0.96,,,,0.99,0.98,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,0.99,0.98,,,0.97,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,'
  const firstResultOffsetMs = 9 * 975
  const firstResultTimestamp = moment(1619211870411 + firstResultOffsetMs)

  const result = parse(raw)

  expect(result[0].start.toISOString()).toBe(firstResultTimestamp.toISOString())
})

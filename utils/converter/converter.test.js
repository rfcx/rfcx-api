const Converter = require('./converter')
const moment = require('moment')

test('empty returns empty', () => {
  const converter = new Converter({})
  return converter.validate()
    .then(result => {
      expect(result).toEqual({})
    })
})

test('can return items', () => {
  const source = { a: 'hello', b: 95 }
  const converter = new Converter(source)
  converter.convert('a').toString()
  converter.convert('b').toInt()
  return converter.validate()
    .then(result => {
      expect(result).toEqual(source)
    })
})

test('can convert to moment', () => {
  const source = { start: '2020-02-03T04:05:06.700Z' }
  const converter = new Converter(source)
  converter.convert('start').toMomentUtc()
  return converter.validate().then(result => {
    expect(result.start).toBeInstanceOf(moment)
    expect(result.start.toISOString()).toStrictEqual(source.start)
  })
})

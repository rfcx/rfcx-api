const ArrayConverter = require('./array')
const { ValidationError } = require('../error-handling/errors')

test('empty returns empty', () => {
  const converter = new ArrayConverter([])
  return converter.validate()
    .then(result => {
      expect(result).toEqual([])
    })
})

test('can return items', () => {
  const source = [
    { a: 'hello', b: 95 },
    { a: 'there' }
  ]
  const converter = new ArrayConverter(source)
  converter.convert('a').toString()
  return converter.validate()
    .then(result => {
      expect(result).toEqual(source)
    })
})

test('can detect missing property', () => {
  const source = [
    { a: 'hello', b: '95' },
    { a: 'there' }
  ]
  const converter = new ArrayConverter(source)
  converter.convert('a').toString()
  converter.convert('b').toInt()
  expect.assertions(1)
  return converter.validate().catch(e => expect(e).toBeInstanceOf(ValidationError))
})

test('can detect incorrect type (int)', () => {
  const source = [
    { a: 'hello', b: '95' },
    { a: 'there', b: 'not an int' }
  ]
  const converter = new ArrayConverter(source)
  converter.convert('a').toString()
  converter.convert('b').toInt()
  expect.assertions(1)
  return converter.validate().catch(e => expect(e).toBeInstanceOf(ValidationError))
})

test('can convert string to int', () => {
  const source = [
    { a: 'hello', b: '95' },
    { a: 'there', b: '59' }
  ]
  const converter = new ArrayConverter(source)
  converter.convert('a').toString()
  converter.convert('b').toInt()
  return converter.validate().then(result => {
    expect(result.length).toBe(2)
    expect(result[0].b).toStrictEqual(95)
    expect(result[1].b).toStrictEqual(59)
  })
})

test('can detect multiple type errors', () => {
  const source = [
    { a: 'hello', b: '95' },
    { a: 'there', b: 'not an int' },
    { a: 'there', b: 'still not an int' }
  ]
  const converter = new ArrayConverter(source)
  converter.convert('a').toString()
  converter.convert('b').toInt()
  expect.assertions(1)
  return converter.validate().catch(e => expect(e).toBeInstanceOf(ValidationError))
})

test('can camelize', () => {
  const source = [
    { foo_bar: 'hello' },
    { foo_bar: 'there' }
  ]
  const converter = new ArrayConverter(source, true)
  converter.convert('foo_bar').toString()
  return converter.validate()
    .then(result => {
      expect(result[0].fooBar).toEqual(source[0].foo_bar)
    })
})

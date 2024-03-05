const { computedAdditions } = require('./index')

describe('test computedAdditions function', () => {
  test('return an empty object if lat or lng is undefined', async () => {
    const additions = computedAdditions({ latitude: 54.2, longitude: undefined })
    expect(additions).toStrictEqual({
      timezone: 'UTC',
      countryCode: null
    })
  })
  test('return expected result for the correct coordinates', async () => {
    const expects = {
      timezone: 'Europe/Isle_of_Man',
      countryCode: 'GB'
    }

    const additions = computedAdditions({ latitude: 54.2, longitude: -4.5 })
    expect(additions).toStrictEqual(expects)
  })
})

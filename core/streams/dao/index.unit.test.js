const { computedAdditions } = require('./index')
const googleMap = require('../../_services/google')

describe('test computedAdditions function', () => {
  test('return an empty object if lat or lng is undefined', async () => {
    const additions = await computedAdditions({ latitude: 54.2, longitude: undefined })
    expect(additions).toStrictEqual({
      timezone: 'UTC',
      countryCode: null
    })
  })
  test('return expected result for the correct coordinates', async () => {
    const mockCountry = jest.spyOn(googleMap, 'getCountry')
    mockCountry.mockReturnValueOnce({
      data: {
        results: [{
          address_components: [{
            short_name: 'IM'
          }]
        }]
      }
    })
    const mockTimezone = jest.spyOn(googleMap, 'getTimezone')
    mockTimezone.mockReturnValueOnce({
      data: {
        timeZoneId: 'Europe/Isle_of_Man'
      }
    })

    const expects = {
      timezone: 'Europe/Isle_of_Man',
      countryCode: 'IM'
    }

    const additions = await computedAdditions({ latitude: 54.2, longitude: -4.5 })
    expect(additions).toStrictEqual(expects)
  })
})

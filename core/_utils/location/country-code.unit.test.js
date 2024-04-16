const { getCountryCodeByLatLng, getCountryNameByCode } = require('./country-code')
const googleMap = require('../../_services/google')

describe('test for getCountryCodeByLatLng function', () => {
  test('works for correct coordinates', async () => {
    const mock = jest.spyOn(googleMap, 'getCountry')
    mock.mockReturnValueOnce({
      data: {
        results: [{
          address_components: [{
            short_name: 'GB'
          }]
        }]
      }
    })
    mock.mockReturnValueOnce({
      data: {
        results: [{
          address_components: [{
            short_name: 'US'
          }]
        }]
      }
    })
    mock.mockReturnValueOnce({
      data: {
        results: [{
          address_components: [{
            short_name: 'PL'
          }]
        }]
      }
    })

    const countryCode1 = await getCountryCodeByLatLng(54.2, -4.5)
    const countryCode2 = await getCountryCodeByLatLng(34.30714385628807, -109.14062499000003)
    const countryCode3 = await getCountryCodeByLatLng(52.775435, 23.9068233)

    expect(countryCode1).toBe('GB')
    expect(countryCode2).toBe('US')
    expect(countryCode3).toBe('PL')
  })
  test('return null for not correct coordinates', async () => {
    const mock = jest.spyOn(googleMap, 'getCountry')
    mock.mockReturnValueOnce({
      data: {
        results: []
      }
    })

    const countryCode = await getCountryCodeByLatLng(40, -40)
    expect(countryCode).toBeNull()
  })
  test('return null for coordinates with null', async () => {
    const countryCode = await getCountryCodeByLatLng(40, null)
    expect(countryCode).toBeNull()
  })
  test('return null for coordinates with unfefined', async () => {
    const countryCode = await getCountryCodeByLatLng(40, undefined)
    expect(countryCode).toBeNull()
  })
})

describe('test for getCountryNameByCode function', () => {
  test('works for correct country code', async () => {
    const countryName1 = getCountryNameByCode('GB')
    const countryName2 = getCountryNameByCode('US')
    const countryName3 = getCountryNameByCode('PL')

    expect(countryName1).toBe('United Kingdom')
    expect(countryName2).toBe('United States of America')
    expect(countryName3).toBe('Poland')
  })
  test('return null for not correct country code', async () => {
    const countryCode = await getCountryCodeByLatLng('G?')
    expect(countryCode).toBe(null)
  })
})

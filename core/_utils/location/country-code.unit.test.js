const { getCountryCodeByLatLng, getCountryNameByCode } = require('./country-code')

describe('test for getCountryCodeByLatLng function', () => {
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

const { getCountryCodeByLatLng, getCountryNameByCode } = require('./country-code')

describe('test for getCountryCodeByLatLng function', () => {
  test('works for correct coordinates', async () => {
    const countryCode1 = getCountryCodeByLatLng(54.2, -4.5)
    const countryCode2 = getCountryCodeByLatLng(34.30714385628807, -109.14062499000003)
    const countryCode3 = getCountryCodeByLatLng(52.775435, 23.9068233)
    expect(countryCode1).toBe('GB')
    expect(countryCode2).toBe('US')
    expect(countryCode3).toBe('PL')
  })
  test('return null for not correct coordinates', async () => {
    const countryCode = getCountryCodeByLatLng(40, -40)
    expect(countryCode).toBe(null)
  })
  test('return null for coordinates with null', async () => {
    const countryCode = getCountryCodeByLatLng(40, null)
    expect(countryCode).toBe(null)
  })
  test('return null for coordinates with unfefined', async () => {
    const countryCode = getCountryCodeByLatLng(40, undefined)
    expect(countryCode).toBe(null)
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
    const countryCode = getCountryCodeByLatLng('G?')
    expect(countryCode).toBe(null)
  })
})

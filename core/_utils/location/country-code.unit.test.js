const { getCountryCodeByLatLng } = require('./country-code')

describe('test for getCountryCodeByLatLng function', () => {
  test('works for correct coordinates', async () => {
    const countryCode1 = getCountryCodeByLatLng(54.2, -4.5)
    const countryCode2 = getCountryCodeByLatLng(34.30714385628807, -109.14062499000003)
    const countryCode3 = getCountryCodeByLatLng(52.775435, 23.9068233)
    expect(countryCode1).toBe('GBR')
    expect(countryCode2).toBe('USA')
    expect(countryCode3).toBe('POL')
  })
  test('return null for not correct coordinates', async () => {
    const countryCode = getCountryCodeByLatLng(40, -40)
    expect(countryCode).toBe(null)
  })
})

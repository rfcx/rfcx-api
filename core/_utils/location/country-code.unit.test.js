const { getCountryCodeByLatLng } = require('./country-code')

describe('test for getCountryCodeByLatLng function', () => {
  test('works for correct coordinates', async () => {
    const countryCode = getCountryCodeByLatLng([-100, 40])
    expect(countryCode).toBe('USA')
  })
  test('return null for not correct coordinates', async () => {
    const countryCode = getCountryCodeByLatLng([40, -40])
    expect(countryCode).toBe(null)
  })
})

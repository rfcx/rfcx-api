const { getTzByLatLng } = require('./timezone')

describe('test for getTzByLatLng function', () => {
  test('works for correct coordinates', async () => {
    const timezone1 = getTzByLatLng(-4.675, 29.636)
    const timezone2 = getTzByLatLng(13, 101)
    const timezone3 = getTzByLatLng(10.9637191, -84.4020265)
    expect(timezone1[0]).toBe('Africa/Dar_es_Salaam')
    expect(timezone2[0]).toBe('Asia/Bangkok')
    expect(timezone3[0]).toBe('America/Costa_Rica')
  })

  test('works for over sea coordinates', async () => {
    const timezone1 = getTzByLatLng(17.208608254026185, 89.2971575584567)
    const timezone2 = getTzByLatLng(34.0881307915738, 28.1892006029502)
    expect(timezone1[0]).toBe('Etc/GMT-6')
    expect(timezone2[0]).toBe('Etc/GMT-2')
  })
})
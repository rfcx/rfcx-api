const { getTzByLatLng } = require('./timezone')
const googleMap = require('../../_services/google')

describe('test for getTzByLatLng function', () => {
  test('works for correct coordinates', async () => {
    const mock = jest.spyOn(googleMap, 'getTimezone')
    mock.mockReturnValueOnce({
      data: {
        timeZoneId: 'Africa/Dar_es_Salaam'
      }
    })
    mock.mockReturnValueOnce({
      data: {
        timeZoneId: 'Asia/Bangkok'
      }
    })
    mock.mockReturnValueOnce({
      data: {
        timeZoneId: 'America/Costa_Rica'
      }
    })

    const timezone1 = await getTzByLatLng(-4.675, 29.636)
    const timezone2 = await getTzByLatLng(13, 101)
    const timezone3 = await getTzByLatLng(10.9637191, -84.4020265)

    expect(timezone1).toBe('Africa/Dar_es_Salaam')
    expect(timezone2).toBe('Asia/Bangkok')
    expect(timezone3).toBe('America/Costa_Rica')
  })

  test('works for over sea coordinates', async () => {
    const mock = jest.spyOn(googleMap, 'getTimezone')
    mock.mockReturnValueOnce({
      data: {}
    })
    mock.mockReturnValueOnce({
      data: {}
    })

    const timezone1 = await getTzByLatLng(17.208608254026185, 89.2971575584567)
    const timezone2 = await getTzByLatLng(34.0881307915738, 28.1892006029502)

    expect(timezone1).toBe('Etc/GMT-6')
    expect(timezone2).toBe('Etc/GMT-2')
  })
})

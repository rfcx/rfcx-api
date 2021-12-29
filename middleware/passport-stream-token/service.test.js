process.env.STREAM_TOKEN_SALT = 'cv4mvsi5rz4gn7nljyuumqkjgsd0igwuxxrwgubutp0mj0w6944lv4lyoj31x4'
const service = require('./service')

describe('parseStreamAndTime', () => {
  let spyError
  beforeAll(() => {
    spyError = jest.spyOn(global.console, 'error').mockImplementation(() => {})
  })
  afterAll(() => {
    spyError.mockRestore()
  })
  describe('assets endpoint', () => {
    test('Should return correct stream id, start, end from asset url', async () => {
      const req = {
        originalUrl: '/internal/assets/streams/e893qsy09mwn_t20210527T205717979Z.20210527T205737979Z_z95_wdolph_g1_fspec_d600.410.png'
      }
      const data = await service.parseStreamAndTime(req)
      expect(data.stream).toEqual('e893qsy09mwn')
      expect(data.start).toEqual(1622149037979)
      expect(data.end).toEqual(1622149057979)
    })
    test('Should return another correct stream id, start, end from asset url', async () => {
      const req = {
        originalUrl: '/internal/assets/streams/719f97595da5_t20200114T142132000Z.20200114T143132000Z_z95_wdolph_g1_fspec_d600.410.png'
      }
      const data = await service.parseStreamAndTime(req)
      expect(data.stream).toEqual('719f97595da5')
      expect(data.start).toEqual(1579011692000)
      expect(data.end).toEqual(1579012292000)
    })
    test('Should return undefined start and end from invalid url', async () => {
      const req = {
        originalUrl: '/internal/assets/streams/fspec_d600.410.png'
      }
      const data = await service.parseStreamAndTime(req)
      expect(data.start).toEqual(undefined)
      expect(data.end).toEqual(undefined)
    })
  })
  describe('detections endpoint', () => {
    test('Should return correct stream id, start, end from detections url', async () => {
      const req = {
        originalUrl: '/streams/e893qsy09mwn/detections?start=2021-05-27T20:57:17.979Z&end=2021-05-27T20:57:37.979Z',
        query: {
          start: '2021-05-27T20:57:17.979Z',
          end: '2021-05-27T20:57:37.979Z'
        }
      }
      const data = await service.parseStreamAndTime(req)
      expect(data.stream).toEqual('e893qsy09mwn')
      expect(data.start).toEqual(1622149037979)
      expect(data.end).toEqual(1622149057979)
    })
    test('Should return another correct stream id, start, end from detections url', async () => {
      const req = {
        originalUrl: '/streams/719f97595da5/detections?start=2020-01-14T14:21:32.000Z&end=2020-01-14T14:31:32.000Z',
        query: {
          start: '2020-01-14T14:21:32.000Z',
          end: '2020-01-14T14:31:32.000Z'
        }
      }
      const data = await service.parseStreamAndTime(req)
      expect(data.stream).toEqual('719f97595da5')
      expect(data.start).toEqual(1579011692000)
      expect(data.end).toEqual(1579012292000)
    })
    test('Should return correct stream id but undefined start and end from detections url', async () => {
      const req = {
        originalUrl: '/streams/719f97595da5/detections'
      }
      const data = await service.parseStreamAndTime(req)
      expect(data.stream).toEqual('719f97595da5')
      expect(data.start).toEqual(undefined)
      expect(data.end).toEqual(undefined)
    })
    test('Should return undefined stream id, start and end from detections url', async () => {
      const req = {
        originalUrl: '/streams'
      }
      const data = await service.parseStreamAndTime(req)
      expect(data.stream).toEqual(undefined)
      expect(data.start).toEqual(undefined)
      expect(data.end).toEqual(undefined)
    })
  })
  describe('other', () => {
    test('Should return undefined stream id, start and end from other url', async () => {
      const req = {
        originalUrl: '/clustered-detections'
      }
      const data = await service.parseStreamAndTime(req)
      expect(data.stream).toEqual(undefined)
      expect(data.start).toEqual(undefined)
      expect(data.end).toEqual(undefined)
    })
  })
})

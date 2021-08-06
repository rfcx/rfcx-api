const { gluedDateStrToMoment, gluedDateStrOrEpochToMoment } = require('./datetime')

test('can parse compact-iso8601 without ms', () => {
  const dateString = '20210728T122655Z' // 28 July 2021 12:26:55
  const result = gluedDateStrToMoment(dateString)

  expect(result.toISOString()).toEqual('2021-07-28T12:26:55.000Z')
})

test('can parse compact-iso8601 with ms', () => {
  const dateString = '20210728T122655750Z' // 28 July 2021 12:26:55.750
  const result = gluedDateStrToMoment(dateString)

  expect(result.toISOString()).toEqual('2021-07-28T12:26:55.750Z')
})

test('can parse epoch instead of compact-iso8601', () => {
  const dateString = '1627475215750' // 28 July 2021 12:26:55.750
  const result = gluedDateStrOrEpochToMoment(dateString)

  expect(result.toISOString()).toEqual('2021-07-28T12:26:55.750Z')
})

test('can parse compact-iso8601 instead of epoch', () => {
  const dateString = '20210728T122655750Z' // 28 July 2021 12:26:55.750
  const result = gluedDateStrOrEpochToMoment(dateString)

  expect(result.toISOString()).toEqual('2021-07-28T12:26:55.750Z')
})

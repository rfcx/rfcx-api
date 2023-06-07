jest.mock('../../_models', () => { return { sequelize: {} } })
jest.mock('../../roles/dao', () => { return { } })
jest.mock('../dao/index', () => { return { } })
jest.mock('../dao/update', () => { return { } })
jest.mock('../dao/review', () => { return { } })

const { calculateReviewStatus } = require('./review')

describe('calculateReviewStatus function', () => {
  test('all values are 0', async () => {
    expect(calculateReviewStatus(0, 0, 0)).toBe(0)
  })
  test('all values are equal', async () => {
    expect(calculateReviewStatus(1, 1, 1)).toBe(0)
  })
  test('another all values are equal', async () => {
    expect(calculateReviewStatus(10, 10, 10)).toBe(0)
  })
  test('all negative values', async () => {
    expect(calculateReviewStatus(10, 0, 0)).toBe(-1)
  })
  test('more negative values with 0 positive', async () => {
    expect(calculateReviewStatus(10, 2, 0)).toBe(-1)
  })
  test('more negative values', async () => {
    expect(calculateReviewStatus(10, 2, 2)).toBe(-1)
  })
  test('all uncertain values', async () => {
    expect(calculateReviewStatus(0, 10, 0)).toBe(0)
  })
  test('more uncertain values', async () => {
    expect(calculateReviewStatus(2, 10, 2)).toBe(0)
  })
  test('more uncertain values with zero negative', async () => {
    expect(calculateReviewStatus(0, 10, 2)).toBe(0)
  })
  test('more uncertain values with zero positive', async () => {
    expect(calculateReviewStatus(2, 10, 0)).toBe(0)
  })
  test('all positive values', async () => {
    expect(calculateReviewStatus(0, 0, 10)).toBe(1)
  })
  test('more positive values with 0 negative', async () => {
    expect(calculateReviewStatus(0, 2, 10)).toBe(1)
  })
  test('more positive values', async () => {
    expect(calculateReviewStatus(2, 2, 10)).toBe(1)
  })
  test('negative and positive are equal', async () => {
    expect(calculateReviewStatus(10, 0, 10)).toBe(0)
  })
  test('negative and positive are equal but some uncertain', async () => {
    expect(calculateReviewStatus(10, 2, 10)).toBe(0)
  })
  test('negative and uncertain are equal', async () => {
    expect(calculateReviewStatus(10, 10, 0)).toBe(0)
  })
  test('negative and uncertain are equal but some positive', async () => {
    expect(calculateReviewStatus(10, 10, 0)).toBe(0)
  })
  test('positive and uncertain are equal', async () => {
    expect(calculateReviewStatus(0, 10, 10)).toBe(0)
  })
  test('positive and uncertain are equal but some negative', async () => {
    expect(calculateReviewStatus(2, 10, 10)).toBe(0)
  })
})

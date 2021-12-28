const { parseFileNameAttrs } = require('./segment-file-utils')

test('can parse last parameter', async () => {
  const result = await parseFileNameAttrs('1234_t20191227T134400000Z.20191227T134420000Z_fwav.wav')

  expect(result.fileType).toBe('wav')
})

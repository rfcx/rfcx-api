const { parseFileNameAttrs } = require('./segment-file-parsing')

test('can parse last parameter', async () => {
  const result = await parseFileNameAttrs('1234_t20191227T134400000Z.20191227T134420000Z_fwav')

  expect(result.fileType).toBe('wav')
})

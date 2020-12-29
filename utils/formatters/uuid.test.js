const { slugToUuid, uuidToSlug, isUuid } = require('./uuid')

test('can detect a uuid', () => {
  const uuid = '6a693702-cbca-4b39-91e8-72368b9ea10d'
  const notUuid = 'someotherstring'
  expect(isUuid(uuid)).toBeTruthy()
  expect(isUuid(notUuid)).toBeFalsy()
})

test('can convert uuid to slug', () => {
  const uuid = 'abfd60e9-562f-4e79-a395-802491bf0106'
  const result = uuidToSlug(uuid)
  expect(result).toEqual('q_1g6VYvTnmjlYAkkb8BBg')
})

test('can convert slug to uuid', () => {
  const uuid = 'q_1g6VYvTnmjlYAkkb8BBg'
  const result = uuidToSlug(uuid)
  expect(result).toEqual('abfd60e9-562f-4e79-a395-802491bf0106')
})

test('can convert to slug and back', () => {
  const uuid = '7b344a51-6531-48f9-b17b-8d0e84eca988'
  const result = slugToUuid(uuidToSlug(uuid))
  expect(result).toEqual(uuid)
})

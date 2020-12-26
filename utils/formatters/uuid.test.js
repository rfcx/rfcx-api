const { slugToUuid, uuidToSlug } = require('./uuid')

test('can convert uuid to slug', () => {
  const uuid = 'abfd60e9-562f-4e79-a395-802491bf0106'
  const result = uuidToSlug(uuid)
  expect(result).toEqual('q_1g6VYvTnmjlYAkkb8BBg')
})

test('can convert to slug and back', () => {
  const uuid = 'abfd60e9-562f-4e79-a395-802491bf0106'
  const result = slugToUuid(uuidToSlug(uuid))
  expect(result).toEqual(uuid)
})

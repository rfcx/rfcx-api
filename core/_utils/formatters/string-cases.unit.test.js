const { toCamelObject } = require('./string-cases')

test('can camelize deep object', () => {
  const obj = {
    external_id: '1234',
    deployment: {
      is_active: true
    },
    classifier_outputs: [
      {
        class_name: 'dog_bark',
        id: 12
      },
      {
        class_name: 'mouse_squeak',
        id: 15
      }
    ]
  }
  const result = toCamelObject(obj)
  expect(Object.keys(result)).toEqual(['externalId', 'deployment', 'classifierOutputs'])
  expect(result.deployment).toEqual({ isActive: true })
  expect(Object.keys(result.classifierOutputs[0])).toEqual(['className', 'id'])
})

test('can camelize deep object with max level limit', () => {
  const obj = {
    external_id: '1234',
    deployment: {
      is_active: true
    },
    classifier_outputs: [
      {
        class_name: 'dog_bark',
        id: 12
      },
      {
        class_name: 'mouse_squeak',
        id: 15
      }
    ]
  }
  const result = toCamelObject(obj, 1)
  expect(Object.keys(result)).toEqual(['externalId', 'deployment', 'classifierOutputs'])
  expect(result.deployment).toEqual({ is_active: true })
  expect(Object.keys(result.classifierOutputs[0])).toEqual(['class_name', 'id'])
})

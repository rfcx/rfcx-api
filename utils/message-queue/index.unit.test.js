const MessageQueue = require('.')

test('Publish is called once', async () => {
  const fakeClient = { publish: jest.fn() }
  const messageQueue = new MessageQueue(fakeClient)

  await messageQueue.enqueue('hello world', {})

  expect(fakeClient.publish).toHaveBeenCalledTimes(1)
})

test('Payload is published', async () => {
  const queuePrefix = 'core'
  const fakeClient = { publish: jest.fn() }
  const messageQueue = new MessageQueue(fakeClient, { queuePrefix })
  const payload = { x: 5, y: 'strawberries' }

  await messageQueue.enqueue('eat', payload)

  expect(fakeClient.publish.mock.calls[0][1]).toEqual(payload)
})

test('Queue prefix is configurable', async () => {
  const queuePrefix = 'core'
  const fakeClient = { publish: jest.fn() }
  const messageQueue = new MessageQueue(fakeClient, { queuePrefix })
  const eventName = 'eat'
  const payload = { x: 5, y: 'strawberries' }

  await messageQueue.enqueue(eventName, payload)

  expect(fakeClient.publish.mock.calls[0][0]).toBe(`${queuePrefix}-${eventName}`)
})

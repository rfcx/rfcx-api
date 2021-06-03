const MessageQueue = require('.')

describe('Publish', () => {
  test('Publish is called once', async () => {
    const fakeClient = { publish: jest.fn() }
    const messageQueue = new MessageQueue(fakeClient)

    await messageQueue.publish('hello world', {})

    expect(fakeClient.publish).toHaveBeenCalledTimes(1)
  })

  test('Payload is published', async () => {
    const queuePrefix = 'core'
    const fakeClient = { publish: jest.fn() }
    const messageQueue = new MessageQueue(fakeClient, { queuePrefix })
    const payload = { x: 5, y: 'strawberries' }

    await messageQueue.publish('eat', payload)

    expect(fakeClient.publish.mock.calls[0][1]).toEqual(payload)
  })

  test('Queue prefix is configurable', async () => {
    const queuePrefix = 'core'
    const fakeClient = { publish: jest.fn() }
    const messageQueue = new MessageQueue(fakeClient, { queuePrefix })
    const eventName = 'eat'
    const payload = { x: 5, y: 'strawberries' }

    await messageQueue.publish(eventName, payload)

    expect(fakeClient.publish.mock.calls[0][0]).toBe(`${queuePrefix}-${eventName}`)
  })
})

describe('Subscribe', () => {
  test('Handler is called once', () => {
    const fakeClient = {
      subscribe: (queueName, handler) => {
        handler({ x: 'Hello', y: 47 })
      }
    }
    const messageQueue = new MessageQueue(fakeClient)
    const messageHandler = jest.fn((message) => Promise.resolve(true))

    messageQueue.subscribe('hello', messageHandler)

    expect(messageHandler).toHaveBeenCalledTimes(1)
  })
})

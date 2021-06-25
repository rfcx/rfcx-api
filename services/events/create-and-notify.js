const { create } = require('.')
const streamsService = require('../streams')
const classificationsService = require('../classifications')
const { notify } = require('./notifications')
const { ValidationError } = require('../../utils/errors')
const { slugToUuid } = require('../../utils/formatters/uuid')

async function createAndNotify (eventData) {
  // Validate
  const stream = await streamsService.get(eventData.stream)
    .catch(() => { throw new ValidationError('Stream not found') })
  const classification = await classificationsService.get(eventData.classification)
    .catch(() => { throw new ValidationError('Classification not found') })

  // Create
  const event = {
    streamId: stream.id,
    classificationId: classification.id,
    classifierEventStrategyId: eventData.classifierEventStrategy,
    start: eventData.start,
    end: eventData.end
  }
  const eventId = await create(event)

  // Notify
  const eventWithStreamAndClassification = { id: slugToUuid(eventId), ...event, stream, classification }
  try {
    await notify(eventWithStreamAndClassification)
  } catch (err) {
    console.error('Failed notifying event:', err.message)
  }

  return eventId
}

module.exports = createAndNotify

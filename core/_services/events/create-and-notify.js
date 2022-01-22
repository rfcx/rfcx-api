const { create } = require('.')
const streamsService = require('../streams')
const classificationsService = require('../classifications')
const { notify } = require('./notifications')
const { createEvent: createLegacyEvent } = require('../../../noncore/_services/legacy/events/events-service-neo4j')
const { ValidationError } = require('../../../common/error-handling/errors')
const { slugToUuid } = require('../../../utils/formatters/uuid')

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

  // Legacy support
  if (process.env.NEO4J_ENABLED === 'true') {
    try {
      await createLegacyEvent(eventWithStreamAndClassification)
    } catch (err) {
      console.error('Failed creating legacy event:', err.message)
    }
  }
  return eventId
}

module.exports = createAndNotify

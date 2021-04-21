const eventsService = require('.')
const streamsService = require('../streams')
const classificationsService = require('../classifications')
const notificationsService = require('./notifications')
const legacyEventsService = require('../legacy/events/events-service-neo4j')
const { ValidationError } = require('../../utils/errors')

async function create (eventData) {
  let stream
  try {
    stream = await streamsService.get(eventData.streamId)
  } catch (err) {
    throw new ValidationError('Stream not found')
  }

  const eventId = await eventsService.create(eventData)
  eventData.id = eventId
  const classification = await classificationsService.get(eventData.classificationId)
  const eventWithStreamAndClassification = { ...eventData, stream, classification }
  try {
    await notificationsService.notifyAboutEvent(eventWithStreamAndClassification)
  } catch (err) {
    console.error('Failed notifying event:', err.message)
  }
  if (process.env.NEO4J_ENABLED === 'true') {
    try {
      await legacyEventsService.createEvent(eventWithStreamAndClassification)
    } catch (err) {
      console.error('Failed creating legacy event:', err.message)
    }
  }
  return eventId
}

module.exports = create

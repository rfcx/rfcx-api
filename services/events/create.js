const eventsService = require('.')
const streamsService = require('../streams')
const classificationsService = require('../classifications')
const notificationsService = require('./notifications')
const legacyEventsService = require('../legacy/events/events-service-neo4j')

async function create (eventData) {
  const eventId = await eventsService.create(eventData)
  eventData.id = eventId
  const stream = await streamsService.getById(eventData.streamId)
  const classification = await classificationsService.getById(eventData.classificationId)
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
}

module.exports = create

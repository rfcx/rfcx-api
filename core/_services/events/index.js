const moment = require('moment')
const { Classification, Classifier, ClassifierEventStrategy, Event, EventStrategy, Sequelize, Stream } = require('../../../models')
const { EmptyResultError, ValidationError, ForbiddenError } = require('../../../utils/errors')
const { isUuid, uuidToSlug, slugToUuid } = require('../../../utils/formatters/uuid')
const { getAccessibleObjectsIDs, hasPermission, READ, UPDATE, STREAM } = require('../roles')
const pagedQuery = require('../../_utils/db/paged-query')
const messageQueue = require('../../../common/message-queue/sns')
const { EVENT_CREATED, EVENT_UPDATED } = require('../../../tasks/event-names')

const availableIncludes = [
  Stream.include(),
  Classification.include(),
  ClassifierEventStrategy.include({
    include: [
      Classifier.include(),
      EventStrategy.include()
    ]
  })
]

function forceIncludeForWhere (includes, associationAs) {
  if (includes.find(i => i.as === associationAs)) {
    return includes
  }
  const extraInclude = availableIncludes.find(i => i.as === associationAs)
  extraInclude.attributes = []
  return [...includes, extraInclude]
}

function create (eventData) {
  return Event.create(eventData)
    .then(async (event) => {
      if (messageQueue.isEnabled()) {
        const message = { id: event.id, streamId: event.streamId }
        await messageQueue.publish(EVENT_CREATED, message).catch((e) => {
          console.error('Event service -> create -> publish failed', e.message || e)
        })
      }
      return uuidToSlug(event.id)
    })
    .catch((e) => {
      console.error(e)
      throw new ValidationError('Cannot create event with provided data')
    })
}

/**
 * Get a list of events matching the filters
 * @param {string} id
 * @param {*} filters Additional query options
 * @param {string[]} filters.streamIds Filter by one or more stream identifiers
 * @param {string[]} filters.classificationValues Filter by one or more classification values
 * @param {string[]} filters.classifierIds Filter by one or more classifier identifiers
 * @param {*} options Additional get options
 * @param {number} options.readableBy Include only if the event is accessible to the given user id
 * @param {string[]} options.fields Attributes and relations to include in results (defaults to lite attributes)
 * @param {boolean} options.descending Order the results in descending date order
 * @param {number} options.limit
 * @param {number} options.offset
 * @returns {Event[]} Events
 */
async function query (filters, options) {
  const attributes = options.fields && options.fields.length > 0 ? Event.attributes.full.filter(a => options.fields.includes(a)) : Event.attributes.lite
  let includes = options.fields && options.fields.length > 0 ? availableIncludes.filter(i => options.fields.includes(i.as)) : availableIncludes.filter(i => i.as === 'classification')

  const where = {
    start: {
      [Sequelize.Op.gte]: moment.utc(filters.start).valueOf(),
      [Sequelize.Op.lt]: moment.utc(filters.end).valueOf()
    }
  }
  if (options.readableBy) {
    const streamIds = await getAccessibleObjectsIDs(options.readableBy, STREAM, filters.streamIds)
    where.stream_id = {
      [Sequelize.Op.in]: streamIds
    }
  } else if (filters.streamIds) {
    where.stream_id = {
      [Sequelize.Op.in]: filters.streamIds
    }
  }
  if (filters.classificationValues) {
    where['$classification.value$'] = { [Sequelize.Op.or]: filters.classificationValues }
    includes = forceIncludeForWhere(includes, 'classification')
  }
  if (filters.classifierIds) {
    where['$classifier_event_strategy.classifier_id$'] = { [Sequelize.Op.or]: filters.classifierIds }
    includes = forceIncludeForWhere(includes, 'classifier_event_strategy')
  }

  const query = {
    where,
    attributes,
    include: includes,
    offset: options.offset,
    limit: options.limit,
    order: [['start', options.descending ? 'DESC' : 'ASC']]
  }

  return pagedQuery(Event, query)
    .then(data => ({ total: data.total, results: data.results.map(format) }))
}

/**
 * Get event by identifier
 * @param {string} id An event identifier slug (preferred) or uuid
 * @param {*} options Additional get options
 * @param {number} options.readableBy Include only if the event is accessible to the given user id
 * @param {string[]} options.fields Attributes and relations to include in results (defaults to full attributes and all includes)
 * @returns {Event} Event
 * @throws EmptyResultError when event not found
 * @throws ForbiddenError when `readableBy` user does not have read permission on the stream to which the event belongs
*/
async function get (id, options = {}) {
  if (!isUuid(id)) {
    id = slugToUuid(id)
  }

  const attributes = options.fields && options.fields.length > 0 ? Event.attributes.full.filter(a => options.fields.includes(a)) : Event.attributes.full
  const includes = options.fields && options.fields.length > 0 ? availableIncludes.filter(i => options.fields.includes(i.as)) : availableIncludes

  const event = await Event.findOne({
    where: { id },
    attributes,
    include: includes
  })

  if (!event) {
    throw new EmptyResultError('Event with given id not found')
  }

  if (options.readableBy && !(await hasPermission(READ, options.readableBy, event.stream_id, STREAM))) {
    throw new ForbiddenError()
  }

  return format(event)
}

/**
 * Update event
 * @param {string} id
 * @param {Event} event Event
 * @param {*} options
 * @param {number} options.updatableBy Update only if event is updatable by the given user id
 * @throws EmptyResultError when event not found
 * @throws ForbiddenError when `updatableBy` user does not have update permission on the stream
 */
async function update (id, event, options = {}) {
  if (!isUuid(id)) {
    try {
      id = slugToUuid(id)
    } catch {
      throw new ValidationError('Invalid event identifier')
    }
  }
  const existingEvent = await Event.findByPk(id)
  if (options.updatableBy && !(await hasPermission(UPDATE, options.updatableBy, existingEvent.streamId, STREAM))) {
    throw new ForbiddenError()
  }
  // TODO if the start is changed then Timescale requires delete and insert
  const result = await Event.update(event, {
    where: { id }
  })
  if (result[0] === 0) {
    throw new EmptyResultError('Event with given id not found')
  }
  if (messageQueue.isEnabled()) {
    await messageQueue.publish(EVENT_UPDATED, { id }).catch((e) => {
      console.error('Event service -> update -> publish failed', e.message || e)
    })
  }
}

function format (event) {
  if (event.id) {
    event.id = uuidToSlug(event.id)
  }
  return event
}

module.exports = {
  create,
  query,
  get,
  update
}

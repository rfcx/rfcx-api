const moment = require('moment')
const { Classification, Classifier, ClassifierEventStrategy, Event, EventStrategy, Sequelize, Stream } = require('../../modelsTimescale')
const ValidationError = require('../../utils/converter/validation-error')
const ForbiddenError = require('../../utils/converter/forbidden-error')
const { isUuid, uuidToSlug, slugToUuid } = require('../../utils/formatters/uuid')
const { getAccessibleObjectsIDs, hasPermission, READ, STREAM } = require('../roles')

// TODO: move to model object
const availableIncludes = [
  {
    as: 'stream',
    model: Stream,
    attributes: Stream.attributes.lite,
    required: true
  },
  {
    as: 'classification',
    model: Classification,
    attributes: Classification.attributes.lite,
    required: true
  },
  {
    as: 'classifier_event_strategy',
    model: ClassifierEventStrategy,
    attributes: ClassifierEventStrategy.attributes.lite,
    required: true,
    include: [
      {
        as: 'classifier',
        model: Classifier,
        attributes: Classifier.attributes.lite,
        required: true
      },
      {
        as: 'event_strategy',
        model: EventStrategy,
        attributes: EventStrategy.attributes.lite,
        required: true
      }
    ]
  }
]

function forceIncludeForWhere (includes, associationAs) {
  if (includes.find(i => i.as === associationAs)) {
    return includes
  }
  const extraInclude = availableIncludes.find(i => i.as === associationAs)
  extraInclude.attributes = []
  return [...includes, extraInclude]
}

async function create (eventData) {
  return Event.create(eventData)
    .then((event) => {
      event.id = uuidToSlug(event.id)
      return event
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

  // TODO use paged query wrapper
  const method = (!!options.limit || !!options.offset) ? 'findAndCountAll' : 'findAll'
  return Event[method](query)
    .then(data => {
      return {
        total: method === 'findAndCountAll' ? data.count : data.length,
        results: (method === 'findAndCountAll' ? data.rows : data).map(format)
      }
    })
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

  // TODO remove hard-coded strings
  if (options.readableBy && !(await hasPermission(READ, options.readableBy, event.stream_id, STREAM))) {
    throw new ForbiddenError()
  }

  return format(event)
}

function format (event) {
  event = event.toJSON()
  if (event.id) {
    event.id = uuidToSlug(event.id)
  }
  return event
}

module.exports = {
  create,
  query,
  get
}

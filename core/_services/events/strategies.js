const { Classifier, ClassifierEventStrategy, EventStrategy, ClassifierOutput } = require('../../../models')
const { EmptyResultError } = require('../../../common/error-handling/errors')

// TODO: we might decide to remove the `classifiers` field option as it includes a lot of data
const availableIncludes = [
  // Get the classifier through classifier_event_strategies (including the fields of c_e_s and classifier_output)
  {
    ...Classifier.include({ as: 'classifiers', required: false }),
    through: ClassifierEventStrategy.include({ attributes: ClassifierEventStrategy.attributes.full.filter(a => a !== 'event_strategy_id') }),
    include: ClassifierOutput.include({ as: 'outputs', required: false })
  }
]

/**
 * Get a list of event strategies matching the filters
 * @param {string} id
 * @param {*} filters Additional query options
 * @param {string} filters.functionName Filter by a function name
 * @param {*} options Additional get options
 * @param {string[]} options.fields Attributes and relations to include in results (defaults to lite attributes)
 * @param {number} options.limit
 * @param {number} options.offset
 * @returns {EventStrategy[]} Event strategies
 */
function query (filters, options) {
  const attributes = options.fields && options.fields.length > 0 ? EventStrategy.attributes.full.filter(a => options.fields.includes(a)) : EventStrategy.attributes.lite
  const includes = options.fields && options.fields.length > 0 ? availableIncludes.filter(i => options.fields.includes(i.as)) : []

  const where = {}

  if (filters.functionName) {
    where.functionName = filters.functionName
  }

  const query = {
    where,
    attributes,
    include: includes,
    offset: options.offset,
    limit: options.limit
  }

  return EventStrategy.findAll(query)
}

/**
 * Get event strategy by identifier
 * @param {string} id Event strategy identifier
 * @param {*} options Additional get options
 * @param {string[]} options.fields Attributes and relations to include in results (defaults to full attributes and all includes)
 * @returns {EventStrategy} Event strategy
 * @throws EmptyResultError when event not found
*/
async function get (id, options = {}) {
  const attributes = options.fields && options.fields.length > 0 ? EventStrategy.attributes.full.filter(a => options.fields.includes(a)) : EventStrategy.attributes.full
  const includes = options.fields && options.fields.length > 0 ? availableIncludes.filter(i => options.fields.includes(i.as)) : availableIncludes

  const event = await EventStrategy.findOne({
    where: { id },
    attributes,
    include: includes
  })

  if (!event) {
    throw new EmptyResultError('Event with given id not found.')
  }

  return event
}

module.exports = {
  query,
  get
}

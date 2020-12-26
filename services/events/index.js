const moment = require('moment')
const models = require('../../modelsTimescale')
const ValidationError = require('../../utils/converter/validation-error')
const { uuidToSlug } = require('../../utils/formatters/uuid')
const rolesService = require('../roles')

async function defaultQueryOptions (user, start, end, streams, classifications, classifiers, descending, limit, offset) {
  const condition = {
    start: {
      [models.Sequelize.Op.gte]: moment.utc(start).valueOf(),
      [models.Sequelize.Op.lt]: moment.utc(end).valueOf()
    }
  }
  if (!user.is_super) {
    const streamIds = await rolesService.getAccessibleObjectsIDs(user.owner_id, 'stream', 'all', streams)
    condition.stream_id = {
      [models.Sequelize.Op.in]: streamIds
    }
  }
  const classificationCondition = classifications === undefined ? {}
    : {
      value: { [models.Sequelize.Op.or]: classifications }
    }
  const classifierCondition = classifiers === undefined ? {}
    : {
      id: { [models.Sequelize.Op.or]: classifiers }
    }

  return {
    where: condition,
    include: [
      {
        as: 'classification',
        model: models.Classification,
        where: classificationCondition,
        attributes: models.Classification.attributes.lite,
        required: true
      },
      {
        as: 'classifier_event_strategy',
        model: models.ClassifierEventStrategy,
        required: true,
        include: [
          {
            as: 'classifier',
            model: models.Classifier,
            where: classifierCondition,
            attributes: models.Classifier.attributes.lite,
            required: true
          }
        ]
      }
    ],
    attributes: models.Event.attributes.lite,
    offset: offset,
    limit: limit,
    order: [['start', descending ? 'DESC' : 'ASC']]
  }
}

async function create (eventData) {
  return models.Event.create(eventData)
    .then((event) => {
      event.id = uuidToSlug(event.id)
      return event
    })
    .catch((e) => {
      console.error(e)
      throw new ValidationError('Cannot create event with provided data')
    })
}

async function query (user, start, end, streams, classifications, classifiers, limit, offset) {
  const queryOptions = await defaultQueryOptions(user, start, end, streams, classifications, classifiers, false, limit, offset)
  const method = (!!limit || !!offset) ? 'findAndCountAll' : 'findAll'
  return models.Event[method](queryOptions)
    .then((data) => {
      return {
        count: method === 'findAndCountAll' ? data.count : data.length,
        events: method === 'findAndCountAll' ? data.rows : data
      }
    })
    .then((data) => {
      data.events = data.events
        .map(x => x.toJSON())
        .map((event) => {
          event.id = uuidToSlug(event.id)
          event.classifier = event.classifier_event_strategy.classifier
          delete event.classifier_event_strategy
          return event
        })
      return data
    })
}

module.exports = {
  create,
  query
}

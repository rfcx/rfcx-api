const moment = require('moment')
const models = require('../../modelsTimescale')
const { propertyToFloat } = require('../../utils/formatters/object-properties')
const { timeBucketAttribute, aggregatedValueAttribute, timeAggregatedQueryAttributes } = require('../../utils/timeseries/time-aggregated-query')

function defaultQueryOptions (streamId, index, start, end, descending, limit, offset) {
  return {
      where: {
        stream_id: streamId,
        time: {
          [models.Sequelize.Op.gte]: moment.utc(start).valueOf(),
          [models.Sequelize.Op.lt]: moment.utc(end).valueOf()
        },
        '$index.code$': index
      },
      include: [
        {
          as: 'index',
          model: models.Index,
          attributes: [],
          required: true
        }
      ],
      attributes: models.IndexValue.attributes.lite,
      offset: offset,
      limit: limit,
      order: [['time', descending ? 'DESC' : 'ASC']],
    }
}

function query (streamId, index, start, end, descending, limit, offset) {
  return models.IndexValue
    .findAll(defaultQueryOptions(streamId, index, start, end, descending, limit, offset))
}

function timeAggregatedQuery (streamId, index, start, end, timeInterval, aggregateFunction, descending, limit, offset) {
  const timeBucketAttribute = 'time_bucket'
  const aggregatedValueAttribute = 'aggregated_value'
  const queryOptions = {
    ...defaultQueryOptions(streamId, index, start, end, descending, limit, offset),
    attributes: timeAggregatedQueryAttributes(timeInterval, aggregateFunction, 'value', 'IndexValue', 'time', timeBucketAttribute, aggregatedValueAttribute, false),
    order: [models.Sequelize.literal(timeBucketAttribute + (descending ? ' DESC' : ''))],
    group: [timeBucketAttribute],
    raw: true,
    nest: true
  }
  return models.IndexValue
    .findAll(queryOptions)
}

module.exports = { query, timeAggregatedQuery }

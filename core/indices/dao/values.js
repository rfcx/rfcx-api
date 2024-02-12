const moment = require('moment')
const models = require('../../_models')
const { timeAggregatedQueryAttributes } = require('../../_utils/db/time-aggregated-query')
const storageService = require('../../_services/storage')

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
    offset,
    limit,
    order: [['time', descending ? 'DESC' : 'ASC']]
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

function create (values) {
  return models.IndexValue.bulkCreate(
    values.map(d => ({
      stream_id: d.streamId,
      index_id: d.indexId,
      time: d.time,
      value: d.value
    })))
}

function getHeatmapStoragePath (streamId, start, end, interval, aggregate) {
  return `${streamId}/heatmap/${start.valueOf()}_${end.valueOf()}_${interval}_${aggregate}.png`
}

async function clearHeatmapCache (streamId, timestamp) {
  const prefix = `${streamId}/heatmap/`
  const files = await storageService.listFiles(storageService.buckets.streamsCache, prefix)
  for (const file of files) {
    const filePath = storageService.getFilePath(file)
    const filename = filePath.replace(prefix, '')
    const filenameParts = filename.split('_')
    const start = parseInt(filenameParts[0])
    const end = parseInt(filenameParts[1])
    if (start <= timestamp && timestamp <= end) {
      await storageService.deleteFile(storageService.buckets.streamsCache, filePath)
    }
  }
}

module.exports = {
  query,
  timeAggregatedQuery,
  create,
  getHeatmapStoragePath,
  clearHeatmapCache
}

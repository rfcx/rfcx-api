const models = require('../../_models')
const moment = require('moment')

async function getClassifierJobParams (projectId, streamsNames, queryStart, queryEnd, queryHours, createdById, segmentsTotal) {
  const classifierJob = {
    projectId: projectId,
    ...streamsNames && { queryStreams: streamsNames.join(',') },
    ...queryStart && { queryStart: moment.utc(queryStart).format('YYYY-MM-DD') },
    ...queryEnd && { queryEnd: moment.utc(queryEnd).format('YYYY-MM-DD') },
    queryHours: queryHours,
    createdById,
    status: 0,
    segmentsTotal
  }
  return classifierJob
}

async function getSegmentsCount (projectId, queryStreams, queryStart, queryEnd, queryHours) {
  const items = (queryStreams === undefined)
    ? await getProjectStreamsIds(projectId)
    : queryStreams.split(',')
  const hours = (queryHours !== undefined)
    ? queryHours.split(',').map(Number)
    : undefined
  const count = await models.StreamSegment.count({
    where: {
      [models.Sequelize.Op.and]: {
        ...items && { stream_id: items },
        start: {
          [models.Sequelize.Op.and]: {
            ...queryStart && { [models.Sequelize.Op.gte]: queryStart },
            ...queryEnd && { [models.Sequelize.Op.lte]: queryEnd },
            // TODO: Check with IN (...) or = ANY(...)
            ...queryHours && {
              [models.Sequelize.Op.and]: models.Sequelize.literal(`extract(hour from "StreamSegment"."start") ANY(${hours})`)
            }
          }
        }
      }
    }
  })
  return count
}

async function getClassifierJobsCountByStatus (status = 0) {
  const count = await models.ClassifierJob.count({
    where: { status }
  })
  return count
}

async function getProjectStreamsIds (projectId) {
  const streams = await models.Stream.findAll({ where: { project_id: projectId }, attributes: ['id'] })
  const streamsIds = streams.map(stream => stream.id)
  return streamsIds
}

async function getStreamsNames (queryStreams) {
  // Do not fill streams names if there are not query streams.
  if (queryStreams === undefined) {
    return
  }
  const items = queryStreams.split(',')
  const streams = await models.Stream.findAll({ where: { id: { [models.Sequelize.Op.in]: items } }, attributes: ['name'] })
  const streamsNames = streams.map(stream => stream.name)
  return streamsNames
}

module.exports = {
  getClassifierJobParams,
  getClassifierJobsCountByStatus,
  getSegmentsCount,
  getStreamsNames
}

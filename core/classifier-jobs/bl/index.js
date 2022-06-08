const models = require('../../_models')
const moment = require('moment')

async function getClassifierJobParams (projectId, streamsNames, queryStart, queryEnd, queryHours, createdById, segmentsTotal) {
  const classifierJob = {
    projectId: projectId,
    ...streamsNames && streamsNames !== undefined && { queryStreams: streamsNames.join(',') },
    ...queryStart && queryStart !== undefined && { queryStart: moment.utc(queryStart).format('YYYY-MM-DD') },
    ...queryEnd && queryEnd !== undefined && { queryEnd: moment.utc(queryEnd).format('YYYY-MM-DD') },
    queryHours: queryHours,
    createdById,
    status: 0,
    segmentsTotal
  }
  return classifierJob
}

async function getSegmentsCount (projectId, queryStreams, queryStart, queryEnd, queryHours) {
  let items
  if (queryStreams === undefined) {
    items = await getProjectStreamsIds(projectId)
  } else {
    items = queryStreams.split(',')
  }
  let hours
  if (queryHours !== undefined) {
    hours = queryHours.split(',').map(Number)
  }
  const count = await models.StreamSegment.count({
    where: {
      [models.Sequelize.Op.and]: {
        stream_id: items,
        start: {
          [models.Sequelize.Op.and]: {
            ...queryStart && queryStart !== undefined && { [models.Sequelize.Op.gte]: queryStart },
            ...queryEnd && queryEnd !== undefined && { [models.Sequelize.Op.lte]: queryEnd },
            ...queryHours && queryHours !== undefined && {
              [models.Sequelize.Op.or]:
              {
                [models.Sequelize.Op.and]: [
                  // TODO: Update parsing hours logic.
                  models.Sequelize.literal(`extract(hour from "StreamSegment"."start") >= ${hours[0]}`),
                  models.Sequelize.literal(`extract(hour from "StreamSegment"."start") <= ${hours[hours.length - 1]}`)
                ]
              }
              // {
              //   [models.Sequelize.Op.and]: [
              //     models.Sequelize.literal('extract(hour from "StreamSegment"."start") >= 17'),
              //     models.Sequelize.literal('extract(hour from "StreamSegment"."start") < 22')
              //   ]
              // }
            }
          }
        }
      }
    }
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

async function getPermissableBy (user) {
  const permissableBy = user && (user.is_super || user.has_system_role) ? undefined : user.id
  return permissableBy
}

module.exports = {
  getClassifierJobParams,
  getSegmentsCount,
  getStreamsNames,
  getPermissableBy
}

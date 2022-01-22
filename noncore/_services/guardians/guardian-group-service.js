const models = require('../../_models')
const sequelize = require('sequelize')
const Converter = require('../../../utils/converter')
const Promise = require('bluebird')
const { ValidationError } = require('../../../common/error-handling/errors')
const eventValueService = require('../legacy/events/event-value-service')
const eventTypeService = require('../legacy/events/event-type-service')
const siteService = require('../sites/sites-service')

const guardianGroupInclude = [
  {
    model: models.Guardian,
    as: 'Guardians',
    attributes: ['guid', 'shortname']
  },
  {
    model: models.GuardianAudioEventType,
    as: 'GuardianAudioEventTypes',
    attributes: ['value']
  },
  {
    model: models.GuardianAudioEventValue,
    as: 'GuardianAudioEventValues',
    attributes: ['value']
  },
  {
    model: models.GuardianSite,
    as: 'Site',
    attributes: ['guid'],
    require: false
  }
]

function getGroupByShortname (shortname) {
  return models.GuardianGroup
    .findOne({
      where: { shortname },
      include: [{ all: true }]
    })
    .then((group) => {
      if (!group) { throw new sequelize.EmptyResultError('GuardianGroup with given shortname not found.') }
      return group
    })
}

function getGroupsByShortnames (shortnames) {
  const proms = []
  shortnames.forEach((shortname) => {
    proms.push(getGroupByShortname(shortname))
  })
  return Promise.all(proms)
}

function getGroups (params) {
  const opts = {
    include: guardianGroupInclude
  }
  if (params.sites) {
    opts.include[3].where = {
      guid: {
        [models.Sequelize.Op.in]: params.sites
      }
    }
  }
  return models.GuardianGroup.findAll(opts)
}

function getAllGroups (extended) {
  const opts = {}
  if (extended) {
    opts.include = guardianGroupInclude
  }
  return models.GuardianGroup
    .findAll(opts)
}

function getAllGuardiansByGuids (guids) {
  const proms = []
  guids.forEach((guid) => {
    const prom = models.Guardian
      .findOne({ where: { guid } })
      .then((guardian) => {
        if (!guardian) { throw new sequelize.EmptyResultError(`Guardian with given guid not found: ${guid}`) }
        return guardian
      })
    proms.push(prom)
  })
  return Promise.all(proms)
}

function doesGroupExist (shortname, name) {
  return models.GuardianGroup
    .findOne({
      where: {
        [models.Sequelize.Op.or]: {
          shortname,
          name
        }
      }
    })
    .then((group) => {
      return !!group
    })
}

function createGroup (opts) {
  let data, group
  return validateCreateGroupParams(opts)
    .then(d => {
      data = d
      return doesGroupExist(data.shortname, data.name)
    })
    .then((exist) => {
      if (exist) {
        throw new ValidationError('Group with this shortname or name already exists.')
      }
      if (data.site) {
        return siteService.getSiteByGuid(data.site)
      }
      return Promise.resolve(null)
    })
    .then((site) => {
      if (site) {
        data.site = site.id
      }
      return models.GuardianGroup.create(data)
    })
    .then(g => {
      group = g
      if (opts.guardians) {
        return updateGuardiansGroupRelations(group, opts)
      }
      return Promise.resolve(true)
    })
    .then(() => {
      if (opts.event_values) {
        return updateGuardianGroupEventValuesRelations(group, opts)
      }
      return Promise.resolve(true)
    })
    .then(() => {
      if (opts.event_types) {
        return updateGuardianGroupEventTypesRelations(group, opts)
      }
      return Promise.resolve(true)
    })
    .then(() => {
      return group.reload({ include: [{ all: true }] })
    })
}

function updateGroup (shortname, opts) {
  let group
  return getGroupByShortname(shortname)
    .then((g) => {
      group = g
      if (opts.site) {
        return siteService.getSiteByGuid(opts.site)
          .then((site) => {
            group.site = site.id
            return group.save()
          })
      }
      return Promise.resolve()
    })
    .then(() => {
      return updateGuardiansGroupRelations(group, opts)
    })
    .then(() => {
      return updateGuardianGroupEventValuesRelations(group, opts)
    })
    .then(() => {
      return updateGuardianGroupEventTypesRelations(group, opts)
    })
}

function deleteGroupByShortname (shortname) {
  return models.GuardianGroup.destroy({ where: { shortname } })
}

function updateGuardiansGroupRelations (group, params) {
  let guardians
  return validateGuardiansRelationsParams(params)
    .then(data => {
      return getAllGuardiansByGuids(data.guardians)
    })
    .then(g => {
      guardians = g
      return clearGuardiansRelationsForGroup(group)
    })
    .then(() => {
      return attachGuardiansToGroup(guardians, group)
    })
    .then(() => {
      return group.reload({ include: [{ all: true }] })
    })
}

function updateGuardianGroupEventValuesRelations (group, params) {
  let eventValues
  return validateGuardianGroupEventValuesRelationsParams(params)
    .then(data => {
      return eventValueService.getAllGuardianAudioEventValuesByValues(data.event_values)
    })
    .then(e => {
      eventValues = e
      return clearGuardianGroupEventValuesRelationsForGroup(group)
    })
    .then(() => {
      return attachEventValuesToGroup(eventValues, group)
    })
    .then(() => {
      return group.reload({ include: [{ all: true }] })
    })
}

function updateGuardianGroupEventTypesRelations (group, params) {
  let eventTypes
  return validateGuardianGroupEventTypesRelationsParams(params)
    .then(data => {
      return eventTypeService.getAllGuardianAudioEventTypesByValues(data.event_types)
    })
    .then(e => {
      eventTypes = e
      return clearGuardianGroupEventTypesRelationsForGroup(group)
    })
    .then(() => {
      return attachEventTypesToGroup(eventTypes, group)
    })
    .then(() => {
      return group.reload({ include: [{ all: true }] })
    })
}

function getAllGroupsForGuardianId (guardianId) {
  return models.GuardianGroup.findAll({
    include: [
      {
        model: models.Guardian,
        where: { id: guardianId }
      },
      {
        model: models.GuardianAudioEventValue
      }
    ]
  })
}

function formatGroup (group, extended) {
  const data = {
    shortname: group.shortname,
    name: group.name,
    description: group.description
  }
  if (extended) {
    data.guardians = group.Guardians
      ? group.Guardians.map((guardian) => {
        return {
          guid: guardian.guid,
          name: guardian.shortname
        }
      })
      : []
    data.event_values = group.GuardianAudioEventValues
      ? group.GuardianAudioEventValues.map((eventValue) => {
        return eventValue.value
      })
      : []
    data.event_types = group.GuardianAudioEventTypes
      ? group.GuardianAudioEventTypes.map((eventType) => {
        return eventType.value
      })
      : []
    data.site = group.Site ? group.Site.guid : null
  }
  return data
}

function formatGroups (groups, extended) {
  return groups.map((group) => {
    return formatGroup(group, extended)
  })
}

function validateCreateGroupParams (data) {
  const transformedParams = {}
  const params = new Converter(data, transformedParams)

  params.convert('shortname').toString().trim().nonEmpty()
  params.convert('name').toString().trim().nonEmpty()
  params.convert('description').toString().trim().optional()
  params.convert('site').toString().trim().optional()

  return params.validate()
}

function validateGuardiansRelationsParams (data) {
  const transformedParams = {}
  const params = new Converter(data, transformedParams)

  params.convert('guardians').toArray()

  return params.validate()
}

function clearGuardiansRelationsForGroup (group) {
  return models.GuardianGroupRelation.destroy({ where: { guardian_group_id: group.id } })
}

function attachGuardiansToGroup (guardians, group) {
  const proms = []
  guardians.forEach(guardian => {
    const prom = group.addGuardian(guardian)
    proms.push(prom)
  })
  return Promise.all(proms)
}

function validateGuardianGroupEventValuesRelationsParams (data) {
  const transformedParams = {}
  const params = new Converter(data, transformedParams)

  params.convert('event_values').toArray()

  return params.validate()
}

function validateGuardianGroupEventTypesRelationsParams (data) {
  const transformedParams = {}
  const params = new Converter(data, transformedParams)

  params.convert('event_types').toArray()

  return params.validate()
}

function clearGuardianGroupEventValuesRelationsForGroup (group) {
  return models.GuardianGroupGuardianAudioEventValueRelation.destroy({ where: { guardian_group_id: group.id } })
}

function clearGuardianGroupEventTypesRelationsForGroup (group) {
  return models.GuardianGroupGuardianAudioEventTypeRelation.destroy({ where: { guardian_group_id: group.id } })
}

function attachEventValuesToGroup (eventValues, group) {
  const proms = [];
  (eventValues || []).forEach(value => {
    const prom = group.addGuardianAudioEventValue(value)
    proms.push(prom)
  })
  return Promise.all(proms)
}

function attachEventTypesToGroup (eventTypes, group) {
  const proms = [];
  (eventTypes || []).forEach(value => {
    const prom = group.addGuardianAudioEventType(value)
    proms.push(prom)
  })
  return Promise.all(proms)
}

module.exports = {
  getGroupByShortname,
  getGroupsByShortnames,
  getAllGroups,
  getGroups,
  createGroup,
  updateGroup,
  deleteGroupByShortname,
  updateGuardiansGroupRelations,
  formatGroup,
  formatGroups,
  getAllGroupsForGuardianId
}

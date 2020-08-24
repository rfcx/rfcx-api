var models = require('../../models')
var sequelize = require('sequelize')
var Promise = require('bluebird')

function getAllGuardianAudioEventTypesByValues (values) {
  const proms = [];
  (values || []).forEach((value) => {
    const prom = models.GuardianAudioEventType
      .findOne({ where: { value } })
      .then((eventType) => {
        if (!eventType) { throw new sequelize.EmptyResultError(`EventType with given value not found: ${value}`) }
        return eventType
      })
    proms.push(prom)
  })
  return Promise.all(proms)
}

function getGuardianAudioEventTypes () {
  return models.GuardianAudioEventType
    .findAll()
    .then((data) => {
      return formatGuardianAudioEventTypes(data)
    })
}

function formatGuardianAudioEventTypes (arr) {
  return arr.map((item) => {
    return item.value
  })
}

module.exports = {
  getAllGuardianAudioEventTypesByValues,
  getGuardianAudioEventTypes
}

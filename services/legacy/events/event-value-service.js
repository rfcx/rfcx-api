var models = require('../../../models')
var sequelize = require('sequelize')
var Promise = require('bluebird')

function getAllGuardianAudioEventValuesByValues (values) {
  const proms = [];
  (values || []).forEach((value) => {
    const prom = models.GuardianAudioEventValue
      .findOne({ where: { value } })
      .then((eventValue) => {
        if (!eventValue) { throw new sequelize.EmptyResultError(`EventValue with given value not found: ${value}`) }
        return eventValue
      })
    proms.push(prom)
  })
  return Promise.all(proms)
}

function getGuardianAudioEventValues (opts) {
  const include = [
    {
      model: models.GuardianAudioEventValueHighLevelKey,
      as: 'HighLevelKey'
    }
  ]
  if (opts.high_level_key) {
    include[0].where = {
      value: opts.high_level_key
    }
  }
  return models.GuardianAudioEventValue
    .findAll({ include })
    .then((data) => {
      return formatGuardianAudioEventValues(data)
    })
}

function formatGuardianAudioEventValue (item) {
  return {
    value: item.value,
    high_level_key: item.HighLevelKey ? item.HighLevelKey.value : null,
    low_level_key: item.low_level_key,
    label: combineGuardianAudioEventValueLabel(item),
    reference_audio: item.reference_audio,
    reference_spectrogram: item.reference_spectrogram,
    image: item.HighLevelKey ? item.HighLevelKey.image : null,
    description: item.HighLevelKey ? item.HighLevelKey.description : null
  }
}

function formatGuardianAudioEventValues (arr) {
  return arr.map(formatGuardianAudioEventValue)
}

function combineGuardianAudioEventValueLabel (item) {
  let label
  if (item.HighLevelKey && item.low_level_key) {
    label = `${item.HighLevelKey.value} ${item.low_level_key}`
  } else if (item.HighLevelKey && !item.low_level_key) {
    label = `${item.HighLevelKey.value}`
  } else if (!item.HighLevelKey && item.low_level_key) {
    label = `${item.low_level_key}`
  } else {
    label = null
  }
  return label
}

function searchForHighLevelKeys (search) {
  return models.GuardianAudioEventValueHighLevelKey
    .findAll({
      where: {
        value: {
          [models.Sequelize.Op.like]: `%${search}%`
        }
      }
    })
    .then((data) => {
      return data.map((item) => {
        return item.value
      })
    })
}

function searchForHighLevelKeysImageAndDescription (search) {
  return models.GuardianAudioEventValueHighLevelKey
    .findOne({
      where: {
        value: {
          [models.Sequelize.Op.like]: `%${search}%`
        }
      }
    })
    .then((data) => {
      if (!data) { throw new sequelize.EmptyResultError('Image and description with given search value not found.') }
      return {
        value: data.value,
        image: data.image,
        description: data.description
      }
    })
}

function getGuardianAudioEventValue (value, ignoreMissing) {
  return models.GuardianAudioEventValue
    .findOne({
      where: { value },
      include: [{ all: true }]
    })
    .then((data) => {
      if (!data && !ignoreMissing) { throw new sequelize.EmptyResultError('Label with given value not found.') }
      return data
    })
}

module.exports = {
  getAllGuardianAudioEventValuesByValues,
  getGuardianAudioEventValues,
  searchForHighLevelKeys,
  combineGuardianAudioEventValueLabel,
  searchForHighLevelKeysImageAndDescription,
  getGuardianAudioEventValue,
  formatGuardianAudioEventValue,
  formatGuardianAudioEventValues
}

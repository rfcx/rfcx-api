var models = require("../../models");
var sequelize = require("sequelize");
var Promise = require("bluebird");

function getAllGuardianAudioEventValuesByValues(values) {
  let proms = [];
  (values || []).forEach((value) => {
    const prom = models.GuardianAudioEventValue
      .findOne({ where: { value } })
      .then((eventValue) => {
        if (!eventValue) { throw new sequelize.EmptyResultError(`EventValue with given value not found: ${value}`); }
        return eventValue;
      });
    proms.push(prom);
  });
  return Promise.all(proms);
}

function getGuardianAudioEventValues(opts) {
  let include = [
    {
      model: models.GuardianAudioEventValueHighLevelKey,
      as: 'HighLevelKey',
    },
  ];
  if (opts['high_level_key']) {
    include[0].where = {
      value: opts['high_level_key'],
    };
  }
  return models.GuardianAudioEventValue
    .findAll({ include })
    .then((data) => {
      return formatGuardianAudioEventValues(data);
    });
}

function formatGuardianAudioEventValues(arr) {
  return arr.map((item) => {
    return {
      value: item.value,
      high_level_key: item.HighLevelKey? item.HighLevelKey.value : null,
      low_level_key: item.low_level_key,
      label: combineGuardianAudioEventValueLabel(item),
    }
  });
}

function combineGuardianAudioEventValueLabel(item) {
  let label;
  if (item.HighLevelKey && item.low_level_key) {
    label = `${item.HighLevelKey.value} ${item.low_level_key}`;
  }
  else if (item.HighLevelKey && !item.low_level_key) {
    label = `${item.HighLevelKey.value}`;
  }
  else if (!item.HighLevelKey && item.low_level_key) {
    label = `${item.low_level_key}`;
  }
  else {
    label = null;
  }
  return label;
}

function searchForHighLevelKeys(search) {
  return models.GuardianAudioEventValueHighLevelKey
    .findAll({
      where: {
        value: {
          $like: `%${search}%`
        }
      }
    })
    .then((data) => {
      return data.map((item) => {
        return item.value;
      });
    })
}

module.exports = {
  getAllGuardianAudioEventValuesByValues,
  getGuardianAudioEventValues,
  searchForHighLevelKeys,
  combineGuardianAudioEventValueLabel,
}

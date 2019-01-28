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

function getGuardianAudioEventValues() {
  return models.GuardianAudioEventValue
    .findAll()
    .then((data) => {
      return formatGuardianAudioEventValues(data);
    });
}

function formatGuardianAudioEventValues(arr) {
  return arr.map((item) => {
      return item.value;
    });
}

module.exports = {
  getAllGuardianAudioEventValuesByValues,
  getGuardianAudioEventValues,
}

var models = require("../../models");

function formatGuardianAudioEventValues(arr) {
  return arr.map((item) => {
      return item.value;
    });
}

function getGuardianAudioEventValues(req) {
  return models.GuardianAudioEventValue
    .findAll()
    .then((data) => {
      return formatGuardianAudioEventValues(data);
    });
}

module.exports = {
  getGuardianAudioEventValues: getGuardianAudioEventValues
};

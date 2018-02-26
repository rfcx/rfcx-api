const sequelize = require("sequelize");
const ValidationError = require("../../utils/converter/validation-error");
const models  = require("../../models");
const Promise = require("bluebird");

function findEntityByParams(audioGuid, AIGuid) {
  return models.AudioAnalysisEntity
    .findOne({
      include: [
        {
          model: models.GuardianAudio,
          as: 'Audio',
          where: { 'guid': audioGuid }
        },
        {
          modesl: models.AudioAnalysisModel,
          as: 'AI',
          where: { 'guid': audioGuid }
        }
      ]
    });
}

function changeEntityState(guardian_audio_id, audio_analysis_model_id, state) {
  return findEntityByParams(guardian_audio_id, audio_analysis_model_id)
    .then((entity) => {
      return entity.update({
        state
      });
    });
}

function findStateByName(name) {
  return models.AudioAnalysisState
    .findOne({
      where: { name }
    });
}

function createEntity(guardian_audio_id, audio_analysis_model_id, state) {
  return models.AudioAnalysisEntry
    .create({
      guardian_audio_id,
      audio_analysis_model_id,
      state
    });
}

module.exports = {
  findEntityByParams,
  changeEntityState,
  findStateByName,
  createEntity,
};

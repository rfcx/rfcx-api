const models = require('../../models')

function findEntityByParams (guardian_audio_id, audio_analysis_model_id) { // eslint-disable-line camelcase
  return models.AudioAnalysisEntry
    .findOne({
      where: {
        guardian_audio_id,
        audio_analysis_model_id
      }
    })
}

function changeEntityState (guardian_audio_id, audio_analysis_model_id, state) { // eslint-disable-line camelcase
  return findEntityByParams(guardian_audio_id, audio_analysis_model_id)
    .then((entity) => {
      return entity.update({
        state
      })
    })
}

function findStateByName (name) {
  return models.AudioAnalysisState
    .findOne({
      where: { name }
    })
}

function createEntity (guardian_audio_id, audio_analysis_model_id, state) { // eslint-disable-line camelcase
  return models.AudioAnalysisEntry
    .create({
      guardian_audio_id,
      audio_analysis_model_id,
      state
    })
}

module.exports = {
  findEntityByParams,
  changeEntityState,
  findStateByName,
  createEntity
}

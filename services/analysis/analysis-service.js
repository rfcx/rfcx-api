
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

module.exports = {

};

"use strict";

module.exports = function(sequelize, DataTypes) {
  var AudioAnalysisEntry = sequelize.define("AudioAnalysisEntry", { }, {
    classMethods: {
      associate: function(models) {
        AudioAnalysisEntry.belongsTo(models.GuardianAudio, {as: "Audio", foreignKey: "guardian_audio_id"});
        AudioAnalysisEntry.belongsTo(models.AudioAnalysisModel, {as: "AI", foreignKey: "audio_analysis_model_id"});
        AudioAnalysisEntry.belongsTo(models.AudioAnalysisState, {as: "State", foreignKey: "state"});
      },
      indexes: [
        {
          unique: true,
          fields: ["guid"]
        }
      ]
    },
    tableName: "AudioAnalysisEntry"
  });

  return AudioAnalysisEntry;
};

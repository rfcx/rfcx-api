"use strict";

module.exports = function(sequelize, DataTypes) {
  var AudioAnalysisTrainingSet = sequelize.define("AudioAnalysisTrainingSet", {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false,
      validate: {
      }
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
        AudioAnalysisTrainingSet.belongsTo(models.GuardianAudioEventValue, { foreignKey: "event_value" });
        AudioAnalysisTrainingSet.belongsTo(models.GuardianAudioCollection, { foreignKey: "training_set" });
        AudioAnalysisTrainingSet.belongsTo(models.GuardianAudioCollection, { foreignKey: "test_set" });
      },
      indexes: [
        {
          unique: true,
          fields: ["guid"]
        }
      ]
    },
    tableName: "AudioAnalysisTrainingSets"
  });

  return AudioAnalysisTrainingSet;
};

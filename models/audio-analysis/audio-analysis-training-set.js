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
      unique: true,
      validate: {
      }
    },
    event_value: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
        //AudioAnalysisTrainingSet.belongsTo(models.GuardianAudioEventValue, { foreignKey: "event_value" });
        AudioAnalysisTrainingSet.belongsTo(models.GuardianAudioCollection, { foreignKey: "training_set", as: 'TrainingSet' });
        AudioAnalysisTrainingSet.belongsTo(models.GuardianAudioCollection, { foreignKey: "test_set", as: 'TestSet' });
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

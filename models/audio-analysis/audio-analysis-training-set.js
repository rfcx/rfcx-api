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
<<<<<<< HEAD
      unique: false,
      validate: {
      }
=======
      unique: true,
      validate: {
      }
    },
    event_value: {
      type: DataTypes.STRING,
      allowNull: false
>>>>>>> 09a159874c5bd486551d220e1945f9e62c78a076
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
<<<<<<< HEAD
        AudioAnalysisTrainingSet.belongsTo(models.GuardianAudioEventValue, { foreignKey: "event_value" });
        AudioAnalysisTrainingSet.belongsTo(models.GuardianAudioCollection, { foreignKey: "training_set" });
        AudioAnalysisTrainingSet.belongsTo(models.GuardianAudioCollection, { foreignKey: "test_set" });
=======
        //AudioAnalysisTrainingSet.belongsTo(models.GuardianAudioEventValue, { foreignKey: "event_value" });
        AudioAnalysisTrainingSet.belongsTo(models.GuardianAudioCollection, { foreignKey: "training_set", as: 'TrainingSet' });
        AudioAnalysisTrainingSet.belongsTo(models.GuardianAudioCollection, { foreignKey: "test_set", as: 'TestSet' });
>>>>>>> 09a159874c5bd486551d220e1945f9e62c78a076
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

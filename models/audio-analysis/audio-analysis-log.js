"use strict";

module.exports = function(sequelize, DataTypes) {
  var AudioAnalysisLog = sequelize.define("AudioAnalysisLog", {

    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },

    queued_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
      validate: {
        isDate: true
      }
    },

    launched_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
      validate: {
        isDate: true
      }
    },

    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: false,
      validate: {
        isInt: true,
        min: 0
      }
    },

    host: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    }

  }, {
    classMethods: {
      associate: function(models) {

        AudioAnalysisLog.belongsTo(models.GuardianAudio, { as: "Audio", foreignKey: "audio_id" });
        AudioAnalysisLog.belongsTo(models.AudioAnalysisModel, { as: "Model", foreignKey: "model_id" });
        
      },
      indexes: [
        {
          unique: true,
          fields: ["guid"]
        }
      ]
    },
    tableName: "AudioAnalysisLogs"
  });

  return AudioAnalysisLog;
};

"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianAudioEvent = sequelize.define("GuardianAudioEvent", {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    confidence: {
      type: DataTypes.FLOAT,
      defaultValue: 1.0,
      allowNull: false,
      validate: {
        isFloat: true,
        min: 0.0,
        max: 1.0
      }
    },
    windows: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true
      }
    },
    begins_at: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: true
      }
    },
    ends_at: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: true
      }
    },
    shadow_latitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        isFloat: true,
        min: -90,
        max: 90
      }
    },
    shadow_longitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        isFloat: true,
        min: -180,
        max: 180
      }
    }
  }, {
    classMethods: {
      associate: function(models) {
        GuardianAudioEvent.belongsTo(models.GuardianAudio, { as: 'Audio', foreignKey: "audio_id" });
        GuardianAudioEvent.belongsTo(models.GuardianAudioEventType, { as: 'Type', foreignKey: "type" });
        GuardianAudioEvent.belongsTo(models.GuardianAudioEventValue, { as: 'Value', foreignKey: "value" });
        GuardianAudioEvent.belongsTo(models.AudioAnalysisModel, { as: 'Model', foreignKey: "model" });
        GuardianAudioEvent.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: "guardian" });
      },
      indexes: [
        {
          unique: true,
          fields: ["guid"]
        }
      ]
    },
    tableName: "GuardianAudioEvents"
  });

  return GuardianAudioEvent;
};

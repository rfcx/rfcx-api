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
      allowNull: false
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
    }
  }, {
    classMethods: {
      associate: function(models) {
        GuardianAudioEvent.belongsTo(models.GuardianAudio, { foreignKey: "audio_id" });
        GuardianAudioEvent.belongsTo(models.GuardianAudioEventType, { foreignKey: "type" });
        GuardianAudioEvent.belongsTo(models.GuardianAudioEventValue, { foreignKey: "value" });
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

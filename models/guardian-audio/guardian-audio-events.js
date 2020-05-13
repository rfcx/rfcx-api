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
        isDate: { msg: "begins_at for GuardianAudioEvent should have type Date" }
      }
    },
    ends_at: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: { msg: "ends_at for GuardianAudioEvent should have type Date" }
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
    },
    reviewer_confirmed: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: null
    },
    comment: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      defaultValue: null
    },
    audio_guid: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null
    },
  }, {
    indexes: [
      { unique: true, fields: ["guid"] }
    ],
    tableName: "GuardianAudioEvents"
  });

  return GuardianAudioEvent;
};

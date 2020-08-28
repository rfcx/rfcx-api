'use strict'

module.exports = function (sequelize, DataTypes) {
  var GuardianAudioBox = sequelize.define('GuardianAudioBox', {
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
    freq_min: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true
      }
    },
    freq_max: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true
      }
    },
    begins_at: {
      type: DataTypes.DATE(3),
      allowNull: false,
      validate: {
        isDate: { msg: 'begins_at for GuardianAudioBox should have type Date' }
      }
    },
    ends_at: {
      type: DataTypes.DATE(3),
      allowNull: false,
      validate: {
        isDate: { msg: 'ends_at for GuardianAudioBox should have type Date' }
      }
    },
    audio_guid: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    indexes: [
      { unique: true, fields: ['guid'] }
    ],
    tableName: 'GuardianAudioBoxes'
  })

  return GuardianAudioBox
}

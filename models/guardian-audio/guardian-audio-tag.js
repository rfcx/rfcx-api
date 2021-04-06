'use strict'

module.exports = function (sequelize, DataTypes) {
  const GuardianAudioTag = sequelize.define('GuardianAudioTag', {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    begins_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
      validate: {
        isDate: { msg: 'begins_at for GuardianAudioTag should have type Date' }
      }
    },
    ends_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
      validate: {
        isDate: { msg: 'ends_at for GuardianAudioTag should have type Date' }
      }
    },
    begins_at_offset: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: false,
      validate: {
        isInt: true,
        min: 0
      }
    },
    ends_at_offset: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: false,
      validate: {
        isInt: true,
        min: 0
      }
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false,
      validate: {
      }
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false,
      validate: {
      }
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
    playback_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 1
      }
    }
  }, {
    indexes: [
      { unique: true, fields: ['guid'] }
    ],
    tableName: 'GuardianAudioTags'
  })

  return GuardianAudioTag
}

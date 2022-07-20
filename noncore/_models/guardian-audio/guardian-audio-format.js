'use strict'

module.exports = function (sequelize, DataTypes) {
  const GuardianAudioFormat = sequelize.define('GuardianAudioFormat', {
    codec: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false
    },
    mime: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false
    },
    file_extension: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false
    },
    sample_rate: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: false,
      validate: {
        isInt: true,
        min: 0
      }
    },
    sample_size: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: false,
      defaultValue: 0,
      validate: {
        isInt: true,
        min: 0,
        max: 64
      }
    },
    channel_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: false,
      defaultValue: 1,
      validate: {
        isInt: true,
        min: 0,
        max: 16
      }
    },
    target_bit_rate: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: false,
      validate: {
        isInt: true,
        min: 0
      }
    },
    is_vbr: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    tableName: 'GuardianAudioFormats'
  })
  GuardianAudioFormat.associate = function (models) {}
  return GuardianAudioFormat
}

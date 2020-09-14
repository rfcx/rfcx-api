'use strict'
module.exports = function (sequelize, DataTypes) {
  var GuardianMetaDateTimeOffset = sequelize.define('GuardianMetaDateTimeOffset', {
    measured_at: {
      type: DataTypes.DATE(3),
      validate: {
        isDate: { msg: 'measured_at for GuardianMetaDateTimeOffset should have type Date' }
      }
    },
    source: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    system_clock_offset: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    },
    system_clock_timezone: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    }
  }, {
    tableName: 'GuardianMetaDateTimeOffsets'
  })

  return GuardianMetaDateTimeOffset
}

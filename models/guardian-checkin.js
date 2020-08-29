'use strict'

module.exports = function (sequelize, DataTypes) {
  var GuardianCheckIn = sequelize.define('GuardianCheckIn', {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    measured_at: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      allowNull: true,
      validate: {
        isDate: {
          msg: 'measured_at for GuardianCheckIn should have type Date'
        }
      }
    },
    queued_at: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      allowNull: true,
      validate: {
        isDate: {
          msg: 'queued_at for GuardianCheckIn should have type Date'
        }
      }
    },
    request_latency_api: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    request_latency_guardian: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    timezone_offset_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    }
  }, {
    indexes: [
      { unique: true, fields: ['guid'] }
    ],
    tableName: 'GuardianCheckIns'
  })

  return GuardianCheckIn
}

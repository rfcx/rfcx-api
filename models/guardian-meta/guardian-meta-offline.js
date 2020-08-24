'use strict'
module.exports = function (sequelize, DataTypes) {
  var GuardianMetaOffline = sequelize.define('GuardianMetaOffline', {
    ended_at: {
      type: DataTypes.DATE(3),
      validate: {
        isDate: {
          msg: 'ended_at for GuardianMetaOffline should have type Date'
        }
      }
    },
    offline_duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    },
    carrier_name: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    }
  }, {
    tableName: 'GuardianMetaOffline'
  })

  return GuardianMetaOffline
}

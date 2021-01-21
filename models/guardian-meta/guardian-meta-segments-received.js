'use strict'
module.exports = function (sequelize, DataTypes) {
  var GuardianMetaSegmentsReceived = sequelize.define('GuardianMetaSegmentsReceived', {

    group_guid: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
      }
    },

    segment_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: 0
      }
    },

    protocol: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },

    origin_address: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },

    received_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
      validate: {
        isDate: {
          msg: 'received_at for GuardianMetaSegmentsReceived should have type Date'
        }
      }
    },

    body: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      validate: {
      }
    }

  }, {
    indexes: [
    ],
    tableName: 'GuardianMetaSegmentsReceived'
  })

  return GuardianMetaSegmentsReceived
}

'use strict'
module.exports = function (sequelize, DataTypes) {
  var GuardianMetaSegmentsQueue = sequelize.define('GuardianMetaSegmentsQueue', {

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

    queued_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
      validate: {
        isDate: {
          msg: 'queued_at for GuardianMetaSegmentsQueue should have type Date'
        }
      }
    },

    protocol: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },

    dispatch_attempts: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },

    received_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
      validate: {
        isDate: {
          msg: 'received_at for GuardianMetaSegmentsQueue should have type Date'
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
    tableName: 'GuardianMetaSegmentsQueue'
  })

  return GuardianMetaSegmentsQueue
}

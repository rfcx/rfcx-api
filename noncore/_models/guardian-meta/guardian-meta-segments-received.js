'use strict'
module.exports = function (sequelize, DataTypes) {
  const GuardianMetaSegmentsReceived = sequelize.define('GuardianMetaSegmentsReceived', {
    group_guid: {
      type: DataTypes.STRING,
      allowNull: false
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
      allowNull: true
    },
    origin_address: {
      type: DataTypes.STRING,
      allowNull: true
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
      allowNull: true
    }
  }, {
    tableName: 'GuardianMetaSegmentsReceived'
  })
  GuardianMetaSegmentsReceived.associate = function (models) {
    GuardianMetaSegmentsReceived.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' })
  }
  return GuardianMetaSegmentsReceived
}

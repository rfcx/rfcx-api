'use strict'
module.exports = function (sequelize, DataTypes) {
  const GuardianMetaSegmentsGroupLog = sequelize.define('GuardianMetaSegmentsGroupLog', {
    group_guid: {
      type: DataTypes.STRING
    },
    segment_count: {
      type: DataTypes.INTEGER
    },
    protocol: {
      type: DataTypes.STRING
    },
    type: {
      type: DataTypes.STRING
    },
    payload: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'GuardianMetaSegmentsGroupLogs'
  })
  GuardianMetaSegmentsGroupLog.associate = function (models) {
    GuardianMetaSegmentsGroupLog.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' })
  }
  return GuardianMetaSegmentsGroupLog
}

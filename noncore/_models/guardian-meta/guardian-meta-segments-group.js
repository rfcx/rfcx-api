'use strict'
module.exports = function (sequelize, DataTypes) {
  const GuardianMetaSegmentsGroup = sequelize.define('GuardianMetaSegmentsGroup', {
    guid: {
      type: DataTypes.STRING,
      allowNull: false
    },
    segment_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    protocol: {
      type: DataTypes.STRING,
      allowNull: true
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true
    },
    checksum_snippet: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'GuardianMetaSegmentsGroups'
  })
  GuardianMetaSegmentsGroup.associate = function (models) {
    GuardianMetaSegmentsGroup.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' })
  }
  return GuardianMetaSegmentsGroup
}

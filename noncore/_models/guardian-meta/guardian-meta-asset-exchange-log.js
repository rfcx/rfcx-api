'use strict'

module.exports = function (sequelize, DataTypes) {
  const GuardianMetaAssetExchangeLog = sequelize.define('GuardianMetaAssetExchangeLog', {
    asset_type: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false
    },
    asset_id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false
    }
  }, {
    tableName: 'GuardianMetaAssetExchangeLogs'
  })
  GuardianMetaAssetExchangeLog.associate = function (models) {
    GuardianMetaAssetExchangeLog.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' })
  }
  return GuardianMetaAssetExchangeLog
}

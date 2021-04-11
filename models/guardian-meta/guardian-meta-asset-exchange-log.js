'use strict'

module.exports = function (sequelize, DataTypes) {
  const GuardianMetaAssetExchangeLog = sequelize.define('GuardianMetaAssetExchangeLog', {
    asset_type: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    asset_id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    }
  }, {
    indexes: [],
    tableName: 'GuardianMetaAssetExchangeLogs'
  })

  return GuardianMetaAssetExchangeLog
}

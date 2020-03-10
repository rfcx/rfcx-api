"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianMetaAssetExchangeLog = sequelize.define("GuardianMetaAssetExchangeLog", {
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
    classMethods: {
      associate: function(models) {
        // associations can be defined here
        GuardianMetaAssetExchangeLog.belongsTo(models.Guardian, {as: 'Guardian'});
      },
      indexes: [
        {
          unique: true,
          fields: ["guid"]
        }
      ]
    }
  });

  return GuardianMetaAssetExchangeLog;
};

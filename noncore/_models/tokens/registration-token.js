'use strict'

module.exports = function (sequelize, DataTypes) {
  const RegistrationToken = sequelize.define('RegistrationToken', {
    guid: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    only_allow_access_to: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    allowed_redemptions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        isInt: true,
        min: 1
      }
    },
    total_redemptions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        isInt: true,
        min: 0
      }
    },
    created_by: {
      type: DataTypes.STRING,
      allowNull: true
    },
    created_for: {
      type: DataTypes.STRING,
      allowNull: true
    },
    auth_token_salt: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    auth_token_hash: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    auth_token_expires_at: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: { msg: 'auth_token_expires_at for RegistrationToken should have type Date' }
      }
    }
  }, {
    tableName: 'RegistrationTokens'
  })
  RegistrationToken.associate = function (models) {}
  return RegistrationToken
}

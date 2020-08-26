'use strict'

module.exports = function (sequelize, DataTypes) {
  var UserToken = sequelize.define('UserToken', {
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
      }
    },
    only_allow_access_to: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
      }
    },
    auth_token_salt: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
      }
    },
    auth_token_hash: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
      }
    },
    auth_token_expires_at: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: { msg: 'auth_token_expires_at for UserToken should have type Date' }
      }
    }
  }, {
    tableName: 'UserTokens'
  })

  return UserToken
}

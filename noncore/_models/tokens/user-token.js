'use strict'

module.exports = function (sequelize, DataTypes) {
  const UserToken = sequelize.define('UserToken', {
    type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    only_allow_access_to: {
      type: DataTypes.TEXT,
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
        isDate: { msg: 'auth_token_expires_at for UserToken should have type Date' }
      }
    }
  }, {
    tableName: 'UserTokens'
  })
  UserToken.associate = function (models) {}
  return UserToken
}

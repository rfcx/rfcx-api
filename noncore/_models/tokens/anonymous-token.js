'use strict'

module.exports = function (sequelize, DataTypes) {
  const AnonymousToken = sequelize.define('AnonymousToken', {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    only_allow_access_to: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_by: {
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
        isDate: { msg: 'auth_token_expires_at for AnonymousToken should have type Date' }
      }
    }
  }, {
    tableName: 'AnonymousTokens'
  })
  AnonymousToken.associate = function (models) {}
  return AnonymousToken
}

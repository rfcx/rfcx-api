'use strict'

module.exports = function (sequelize, DataTypes) {
  var ResetPasswordToken = sequelize.define('ResetPasswordToken', {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    expires_at: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: { msg: 'expires_at for ResetPasswordToken should have type Date' }
      }
    }
  }, {
    indexes: [
      { unique: true, fields: ['guid'] }
    ],
    tableName: 'ResetPasswordTokens'
  })

  return ResetPasswordToken
}

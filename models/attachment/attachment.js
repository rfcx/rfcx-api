'use strict'

module.exports = function (sequelize, DataTypes) {
  var Attachment = sequelize.define('Attachment', {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      unique: true
    },
    reported_at: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: { msg: 'reported_at for Attachment should have type Date' }
      }
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    indexes: [
      { unique: true, fields: ['guid'] }
    ],
    tableName: 'Attachments'
  })

  return Attachment
}

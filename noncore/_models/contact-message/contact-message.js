'use strict'

module.exports = function (sequelize, DataTypes) {
  const ContactMessage = sequelize.define('ContactMessage', {
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false
    },
    message: {
      type: DataTypes.TEXT('long'),
      allowNull: true
    }
  }, {
    tableName: 'ContactMessages'
  })

  return ContactMessage
}

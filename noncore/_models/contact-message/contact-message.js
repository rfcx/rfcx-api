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
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'ContactMessages'
  })
  ContactMessage.associate = function (models) {}
  return ContactMessage
}

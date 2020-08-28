'use strict'

module.exports = function (sequelize, DataTypes) {
  var GuardianAudioEventReasonForCreation = sequelize.define('GuardianAudioEventReasonForCreation', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    indexes: [
      { unique: true, fields: ['name'] }
    ],
    tableName: 'GuardianAudioEventReasonsForCreation'
  })

  return GuardianAudioEventReasonForCreation
}

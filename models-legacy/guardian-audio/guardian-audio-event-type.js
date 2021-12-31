'use strict'

module.exports = function (sequelize, DataTypes) {
  const GuardianAudioEventType = sequelize.define('GuardianAudioEventType', {
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    tableName: 'GuardianAudioEventTypes'
  })

  return GuardianAudioEventType
}

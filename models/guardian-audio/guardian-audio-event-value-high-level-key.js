'use strict'

module.exports = function (sequelize, DataTypes) {
  var GuardianAudioEventValueHighLevelKey = sequelize.define('GuardianAudioEventValueHighLevelKey', {
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    image: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT('long'),
      allowNull: false
    }
  }, {
    indexes: [
      { unique: true, fields: ['value'] }
    ],
    tableName: 'GuardianAudioEventValueHighLevelKeys'
  })

  return GuardianAudioEventValueHighLevelKey
}

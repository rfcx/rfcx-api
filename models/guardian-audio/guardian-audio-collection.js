'use strict'

module.exports = function (sequelize, DataTypes) {
  var GuardianAudioCollection = sequelize.define('GuardianAudioCollection', {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    }
  }, {
    indexes: [
      { unique: true, fields: ['guid'] }
    ],
    tableName: 'GuardianAudioCollections'
  })

  return GuardianAudioCollection
}

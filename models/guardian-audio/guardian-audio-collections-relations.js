'use strict'

module.exports = function (sequelize, DataTypes) {
  const GuardianAudioCollectionsRelations = sequelize.define('GuardianAudioCollectionsRelation', {
    note: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    position: {
      type: DataTypes.INTEGER
    }
  }, {
    tableName: 'GuardianAudioCollectionsRelations'
  })

  return GuardianAudioCollectionsRelations
}

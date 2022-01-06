'use strict'

module.exports = function (sequelize, DataTypes) {
  const GuardianAudioUpload = sequelize.define('GuardianAudioUpload', {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    measured_at: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: { msg: 'measured_at for GuardianAudioUpload should have type Date' }
      }
    },
    url: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
      }
    }
  }, {
    indexes: [
      { unique: true, fields: ['guid'] }
    ],
    tableName: 'GuardianAudioUploads'
  })

  return GuardianAudioUpload
}

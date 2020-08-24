'use strict'

module.exports = function (sequelize, DataTypes) {
  var GuardianSoftwareVersion = sequelize.define('GuardianSoftwareVersion', {
    version: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
      }
    },
    release_date: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: { msg: 'release_date for GuardianSoftwareVersion should have type Date' }
      }
    },
    is_available: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      validate: {
      }
    },
    sha1_checksum: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },
    url: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: true
      }
    }
  }, {
    tableName: 'GuardianSoftwareVersions'
  })

  return GuardianSoftwareVersion
}

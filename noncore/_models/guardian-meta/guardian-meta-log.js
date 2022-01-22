'use strict'

module.exports = function (sequelize, DataTypes) {
  const GuardianMetaLog = sequelize.define('GuardianMetaLog', {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    captured_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
      validate: {
        isDate: {
          msg: 'captured_at for GuardianMetaLog should have type Date'
        }
      }
    },
    url: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
      }
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    sha1_checksum: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    }
  }, {
    indexes: [
      { unique: true, fields: ['guid'] }
    ],
    tableName: 'GuardianMetaLogs'
  })

  return GuardianMetaLog
}
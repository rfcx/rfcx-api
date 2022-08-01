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
      unique: true
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
      unique: false
    }
  }, {
    tableName: 'GuardianMetaLogs'
  })
  GuardianMetaLog.associate = function (models) {
    GuardianMetaLog.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' })
  }
  return GuardianMetaLog
}

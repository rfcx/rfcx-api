'use strict'

module.exports = function (sequelize, DataTypes) {
  const GuardianMetaScreenShot = sequelize.define('GuardianMetaScreenShot', {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    captured_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
      validate: {
        isDate: {
          msg: 'captured_at for GuardianMetaScreenShot should have type Date'
        }
      }
    },
    url: {
      type: DataTypes.STRING,
      allowNull: true
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
    tableName: 'GuardianMetaScreenShots'
  })
  GuardianMetaScreenShot.associate = function (models) {
    GuardianMetaScreenShot.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' })
  }
  return GuardianMetaScreenShot
}

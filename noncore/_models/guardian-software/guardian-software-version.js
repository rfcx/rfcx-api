'use strict'

module.exports = function (sequelize, DataTypes) {
  const GuardianSoftwareVersion = sequelize.define('GuardianSoftwareVersion', {
    version: {
      type: DataTypes.STRING,
      allowNull: false
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
      defaultValue: false
    },
    sha1_checksum: {
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
  GuardianSoftwareVersion.associate = function (models) {
    GuardianSoftwareVersion.belongsTo(models.GuardianSoftware, { as: 'SoftwareRole', foreignKey: 'software_role_id' })
  }
  return GuardianSoftwareVersion
}

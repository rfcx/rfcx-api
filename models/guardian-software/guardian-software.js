'use strict'

module.exports = function (sequelize, DataTypes) {
  const GuardianSoftware = sequelize.define('GuardianSoftware', {
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
      }
    },
    is_available: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      validate: {
      }
    },
    is_updatable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      validate: {
      }
    },
    is_extra: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      validate: {
      }
    }
  }, {
    tableName: 'GuardianSoftware'
  })

  return GuardianSoftware
}

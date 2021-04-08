'use strict'
module.exports = function (sequelize, DataTypes) {
  const GuardianMetaNetwork = sequelize.define('GuardianMetaNetwork', {
    measured_at: {
      type: DataTypes.DATE(3),
      validate: {
        isDate: {
          msg: 'measured_at for GuardianMetaNetwork should have type Date'
        }
      }
    },
    signal_strength: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    },
    network_type: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },
    carrier_name: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    }
  }, {
    tableName: 'GuardianMetaNetwork'
  })

  return GuardianMetaNetwork
}

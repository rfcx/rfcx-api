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
      allowNull: true
    },
    carrier_name: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'GuardianMetaNetwork'
  })
  GuardianMetaNetwork.associate = function (models) {
    GuardianMetaNetwork.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' })
  }
  return GuardianMetaNetwork
}

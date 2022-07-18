'use strict'
module.exports = function (sequelize, DataTypes) {
  const GuardianMetaHardware = sequelize.define('GuardianMetaHardware', {
    phone_imei: {
      type: DataTypes.STRING,
      allowNull: true
    },
    phone_imsi: {
      type: DataTypes.STRING,
      allowNull: true
    },
    android_version: {
      type: DataTypes.STRING,
      allowNull: true
    },
    android_build: {
      type: DataTypes.STRING,
      allowNull: true
    },
    manufacturer: {
      type: DataTypes.STRING,
      allowNull: true
    },
    model: {
      type: DataTypes.STRING,
      allowNull: true
    },
    brand: {
      type: DataTypes.STRING,
      allowNull: true
    },
    product: {
      type: DataTypes.STRING,
      allowNull: true
    },
    phone_sim_carrier: {
      type: DataTypes.STRING,
      allowNull: true
    },
    phone_sim_serial: {
      type: DataTypes.STRING,
      allowNull: true
    },
    phone_sim_number: {
      type: DataTypes.STRING,
      allowNull: true
    },
    iridium_imei: {
      type: DataTypes.STRING,
      allowNull: true
    },
    swarm_serial: {
      type: DataTypes.STRING,
      allowNull: true
    },
    sentinel_version: {
      type: DataTypes.STRING,
      allowNull: true
    },
    sentry_version: {
      type: DataTypes.STRING,
      allowNull: true
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'GuardianMetaHardware'
  })
  GuardianMetaHardware.associate = function (models) {
    GuardianMetaHardware.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' })
  }
  return GuardianMetaHardware
}

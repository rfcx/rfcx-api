'use strict'

module.exports = function (sequelize, DataTypes) {
  const GuardianCheckIn = sequelize.define('GuardianCheckIn', {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    measured_at: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      allowNull: true,
      validate: {
        isDate: {
          msg: 'measured_at for GuardianCheckIn should have type Date'
        }
      }
    },
    queued_at: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      allowNull: true,
      validate: {
        isDate: {
          msg: 'queued_at for GuardianCheckIn should have type Date'
        }
      }
    },
    request_latency_api: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    request_latency_guardian: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    request_size: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    }
  }, {
    tableName: 'GuardianCheckIns'
  })
  GuardianCheckIn.associate = function (models) {
    GuardianCheckIn.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' })
    // GuardianCheckIn.hasMany(models.GuardianAudio, { as: 'Audio', foreignKey: 'check_in_id' })
    // GuardianCheckIn.hasMany(models.GuardianMetaCPU, { as: 'MetaCPU', foreignKey: 'check_in_id' })
    // GuardianCheckIn.hasMany(models.GuardianMetaBattery, { as: 'MetaBattery', foreignKey: 'check_in_id' })
    // GuardianCheckIn.hasMany(models.GuardianMetaDataTransfer, { as: 'MetaDataTransfer', foreignKey: 'check_in_id' })
    // GuardianCheckIn.hasMany(models.GuardianMetaLightMeter, { as: 'MetaLightMeter', foreignKey: 'check_in_id' })
    // GuardianCheckIn.hasMany(models.GuardianMetaGeoLocation, { as: 'MetaGeoLocation', foreignKey: 'check_in_id' })
    // GuardianCheckIn.hasMany(models.GuardianMetaGeoPosition, { as: 'MetaGeoPosition', foreignKey: 'check_in_id' })
    // GuardianCheckIn.hasMany(models.GuardianMetaDateTimeOffset, { as: 'MetaDateTimeOffset', foreignKey: 'check_in_id' })
    // GuardianCheckIn.hasMany(models.GuardianMetaMqttBrokerConnection, { as: 'MetaMqttBrokerConnection', foreignKey: 'check_in_id' })
    // GuardianCheckIn.hasMany(models.GuardianMetaNetwork, { as: 'MetaNetwork', foreignKey: 'check_in_id' })
    // GuardianCheckIn.hasMany(models.GuardianMetaOffline, { as: 'MetaOffline', foreignKey: 'check_in_id' })
    // GuardianCheckIn.hasMany(models.GuardianMetaPower, { as: 'MetaPower', foreignKey: 'check_in_id' })
    // GuardianCheckIn.hasMany(models.GuardianMetaMessage, { as: 'MetaMessages', foreignKey: 'check_in_id' })
    // GuardianCheckIn.hasMany(models.GuardianEvent, { as: 'Event', foreignKey: 'check_in_id' })
    // GuardianCheckIn.hasMany(models.GuardianMetaSentinelPower, { as: 'GuardianMetaSentinelPower', foreignKey: 'check_in_id' })
    // GuardianCheckIn.hasMany(models.GuardianMetaSentinelAccelerometer, { as: 'GuardianMetaSentinelAccelerometer', foreignKey: 'check_in_id' })
    // GuardianCheckIn.hasMany(models.GuardianMetaSentinelCompass, { as: 'GuardianMetaSentinelCompass', foreignKey: 'check_in_id' })
  }
  return GuardianCheckIn
}

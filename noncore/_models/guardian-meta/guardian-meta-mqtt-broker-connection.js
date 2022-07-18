'use strict'
module.exports = function (sequelize, DataTypes) {
  const GuardianMetaMqttBrokerConnection = sequelize.define('GuardianMetaMqttBrokerConnection', {
    connected_at: {
      type: DataTypes.DATE(3),
      validate: {
        isDate: {
          msg: 'connected_at for GuardianMetaMqttBrokerConnection should have type Date'
        }
      }
    },
    broker_uri: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false
    },
    connection_latency: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    },
    subscription_latency: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    }
  }, {
    tableName: 'GuardianMetaMqttBrokerConnections'
  })
  GuardianMetaMqttBrokerConnection.associate = function (models) {
    GuardianMetaMqttBrokerConnection.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' })
  }
  return GuardianMetaMqttBrokerConnection
}

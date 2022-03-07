'use strict'

module.exports = function (sequelize, DataTypes) {
  const HealthCheck = sequelize.define('HealthCheck', {
  }, {
    tableName: 'HealthCheck'
  })

  return HealthCheck
}

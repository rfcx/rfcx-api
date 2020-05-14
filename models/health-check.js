"use strict";

module.exports = function(sequelize, DataTypes) {
  var HealthCheck = sequelize.define("HealthCheck", {
  }, {
    tableName: "HealthCheck"
  });

  return HealthCheck;
};

"use strict";

module.exports = function(sequelize, DataTypes) {
  var HealthCheck = sequelize.define("HealthCheck", {
  }, {
    classMethods: {
      associate: function(models) {
      },
      indexes: [
      ]
    },
    tableName: "HealthCheck"
  });

  return HealthCheck;
};

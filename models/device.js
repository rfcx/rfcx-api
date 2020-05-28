"use strict";

module.exports = function(sequelize, DataTypes) {
  var Device = sequelize.define("Device", {
    firebaseToken: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    os: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
    }
  }, {
    tableName: "Devices"
  });

  return Device;
};

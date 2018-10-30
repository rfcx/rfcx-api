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
    classMethods: {
      associate: function(models) {
        Device.belongsTo(models.User, { as: 'User', foreignKey: "user_id" });
      },
      indexes: [
        {
          unique: true,
          fields: ['firebaseToken']
        }
      ]
    },
    tableName: "Devices"
  });

  return Device;
};

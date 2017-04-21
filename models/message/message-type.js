"use strict";

module.exports = function(sequelize, DataTypes) {
  var MessageType = sequelize.define("MessageType", {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    classMethods: {
      indexes: [{
        unique: true,
        fields: ["name"]
      }]
    },
    tableName: "MessageTypes"
  });

  return MessageType;
};

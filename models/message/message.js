"use strict";

module.exports = function(sequelize, DataTypes) {
  var Message = sequelize.define("Message", {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    time: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: { msg: "time for Message should have type Date" }
      }
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        isFloat: true,
        min: -90,
        max: 90
      }
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        isFloat: true,
        min: -180,
        max: 180
      }
    },
    text: {
      type: DataTypes.TEXT('long'),
      allowNull: true
    }
  }, {
    indexes: [
      { unique: true, fields: ["guid"] }
    ],
    tableName: "Messages"
  });

  return Message;
};

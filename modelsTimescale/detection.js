"use strict";

module.exports = function(sequelize, DataTypes) {
  var Detection = sequelize.define("Detection", {
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    label: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false
    },
    model: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false
    },
    stream: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false
    },
    confidence: {
      type: DataTypes.FLOAT,
      defaultValue: 1.0,
      allowNull: false,
      validate: {
        isFloat: true,
        min: 0.0,
        max: 1.0
      }
    },
    start: {
      type: DataTypes.DATE(3),
      allowNull: false,
      validate: {
        isDate: { msg: "'start' for Detection should have type Date" }
      }
    },
    end: {
      type: DataTypes.DATE(3),
      allowNull: false,
      validate: {
        isDate: { msg: "'end' for Detection should have type Date" }
      }
    }
  }, {
    indexes: [
      { unique: true, fields: ["uuid"] }
    ],
    tableName: "Detections"
  });

  return Detection;
};

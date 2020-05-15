"use strict";

module.exports = function(sequelize, DataTypes) {
  var Annotation = sequelize.define("Annotation", {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
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
    freq_min: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true
      }
    },
    freq_max: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true
      }
    },
    starts: {
      type: DataTypes.BIGINT.UNSIGNED,
      validate: {
        isInt: true,
        min: {
          args: [ 0 ],
          msg: 'starts should be equal to or greater than 0'
        },
        max: {
          args: [ 32503669200000 ],
          msg: 'starts should be equal to or less than 32503669200000'
        }
      }
    },
    ends: {
      type: DataTypes.BIGINT.UNSIGNED,
      validate: {
        isInt: true,
        min: {
          args: [ 0 ],
          msg: 'ends should be equal to or greater than 0'
        },
        max: {
          args: [ 32503669200000 ],
          msg: 'ends should be equal to or less than 32503669200000'
        }
      }
    },
  }, {
    indexes: [
      { unique: true, fields: ["guid"] }
    ],
    tableName: "Annotations"
  });

  return Annotation;
};

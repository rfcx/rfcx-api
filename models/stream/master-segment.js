
"use strict";

module.exports = function(sequelize, DataTypes) {
  var MasterSegment = sequelize.define("MasterSegment", {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      unique: true
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false,
      validate: { }
    }
  }, {
    classMethods: {
      associate: function(models) {

      },
      indexes: [
        {
          unique: true,
          fields: ["guid"]
        }
      ]
    },
    tableName: "MasterSegments"
  });

  return MasterSegment;
};


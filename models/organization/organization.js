"use strict";

module.exports = function(sequelize, DataTypes) {
  var Organization = sequelize.define("Organization", {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { }
    },
  }, {
    classMethods: {
      associate: function() {

      },
      indexes: [
        {
          unique: true,
          fields: ["guid"]
        }
      ]
    },
    tableName: "Organizations"
  });

  return Organization;
};

"use strict";

module.exports = function(sequelize, DataTypes) {
  var AdoptProtectDonor = sequelize.define("AdoptProtectDonor", {
    guid: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    hectares: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        isInt: true,
        min: 0
      }
    },
    donated_at: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: true
      }
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
    tableName: "AdoptProtectDonors"
  });

  return AdoptProtectDonor;
};

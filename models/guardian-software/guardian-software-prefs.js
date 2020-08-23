"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianSoftwarePrefs = sequelize.define("GuardianSoftwarePrefs", {

    pref_key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false,
      validate: {
      }
    },

    pref_value: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    }

  }, {
    tableName: "GuardianSoftwarePrefs"
  });

  return GuardianSoftwarePrefs;
};

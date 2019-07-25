"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianAudioEventValueHighLevelKey = sequelize.define("GuardianAudioEventValueHighLevelKey", {
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    }
  }, {
    classMethods: {
      associate: function(models) {
        GuardianAudioEventValueHighLevelKey.hasMany(models.GuardianAudioEventValue, { as: "Value", foreignKey: "high_level_key"});
      },
      indexes: [
        {
          unique: true,
          fields: ["key"]
        }
      ]
    },
    tableName: "GuardianAudioEventValueHighLevelKeys"
  });

  return GuardianAudioEventValueHighLevelKey;
};

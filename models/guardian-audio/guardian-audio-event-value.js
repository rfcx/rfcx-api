"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianAudioEventValue = sequelize.define("GuardianAudioEventValue", {
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    low_level_key: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
    },
  }, {
    classMethods: {
      associate: function(models) {
        GuardianAudioEventValue.belongsToMany(models.GuardianGroup, { through: models.GuardianGroupGuardianAudioEventValueRelation });
        GuardianAudioEventValue.belongsTo(models.GuardianAudioEventValueHighLevelKey, { as: 'HighLevelKey', foreignKey: "high_level_key" });
      },
      indexes: [
      ]
    },
    tableName: "GuardianAudioEventValues"
  });

  return GuardianAudioEventValue;
};

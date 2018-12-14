"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianAudioEventValue = sequelize.define("GuardianAudioEventValue", {
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    classMethods: {
      associate: function(models) {
        GuardianAudioEventValue.belongsToMany(models.GuardianGroup, { through: models.GuardianGroupGuardianAudioEventValueRelation });
      },
      indexes: [
      ]
    },
    tableName: "GuardianAudioEventValues"
  });

  return GuardianAudioEventValue;
};

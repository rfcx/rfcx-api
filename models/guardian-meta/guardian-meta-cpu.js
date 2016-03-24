'use strict';
module.exports = function(sequelize, DataTypes) {
  var GuardianMetaCPU = sequelize.define('GuardianMetaCPU', {
    measured_at: {
      type: DataTypes.DATE(3),
      validate: {
        isDate: true
      }
    },
    cpu_percent: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    cpu_clock: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    }
  }, {
    classMethods: {
      associate: function(models) {
        GuardianMetaCPU.belongsTo(models.Guardian, {as: 'Guardian'});
      }
    },
    tableName: "GuardianMetaCPU"
  });
  return GuardianMetaCPU;
};
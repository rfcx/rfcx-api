'use strict';
module.exports = function(sequelize, DataTypes) {
  var GuardianMetaAccelerometer = sequelize.define('GuardianMetaAccelerometer', {
    measured_at: {
      type: DataTypes.DATE(3),
      validate: {
        isDate: true
      }
    },
    x: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        isFloat: true
      }
    },
    y: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        isFloat: true
      }
    },
    z: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        isFloat: true
      }
    },
    sample_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        isInt: true,
        min: 0
      }
    }
  }, {
    classMethods: {
      associate: function(models) {
        GuardianMetaAccelerometer.belongsTo(models.Guardian, {as: 'Guardian'});
      }
    },
    tableName: "GuardianMetaAccelerometer"
  });
  return GuardianMetaAccelerometer;
};
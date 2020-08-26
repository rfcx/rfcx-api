'use strict'
module.exports = function (sequelize, DataTypes) {
  var GuardianMetaCPU = sequelize.define('GuardianMetaCPU', {
    measured_at: {
      type: DataTypes.DATE(3),
      validate: {
        isDate: { msg: 'measured_at for GuardianMetaCPU should have type Date' }
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
    tableName: 'GuardianMetaCPU'
  })

  return GuardianMetaCPU
}

'use strict'
module.exports = function (sequelize, DataTypes) {
  const GuardianMetaPower = sequelize.define('GuardianMetaPower', {
    measured_at: {
      type: DataTypes.DATE(3),
      validate: {
        isDate: {
          msg: 'measured_at for GuardianMetaPower should have type Date'
        }
      }
    },
    is_powered: {
      type: DataTypes.BOOLEAN
    },
    is_charged: {
      type: DataTypes.BOOLEAN
    }
  }, {
    tableName: 'GuardianMetaPower'
  })

  return GuardianMetaPower
}

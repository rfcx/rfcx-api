'use strict'

module.exports = function (sequelize, DataTypes) {
  var GuardianMetaInstructionsLog = sequelize.define('GuardianMetaInstructionsLog', {
    instr_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: 0
      }
    },
    queued_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
      validate: {
        isDate: {
          msg: 'queued_at for GuardianMetaInstructionsLog should have type Date'
        }
      }
    },
    executed_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
      validate: {
        isDate: {
          msg: 'executed_at for GuardianMetaInstructionsLog should have type Date'
        }
      }
    },
    response_json: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },
    command: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },
    meta_json: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },
    dispatch_attempts: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    execution_attempts: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    received_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
      validate: {
        isDate: {
          msg: 'received_at for GuardianMetaInstructionsLog should have type Date'
        }
      }
    }
  }, {
    indexes: [
    ],
    tableName: 'GuardianMetaInstructionsLog'
  })

  return GuardianMetaInstructionsLog
}

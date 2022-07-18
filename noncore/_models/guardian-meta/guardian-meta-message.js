'use strict'

module.exports = function (sequelize, DataTypes) {
  const GuardianMetaMessage = sequelize.define('GuardianMetaMessage', {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    received_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
      validate: {
        isDate: {
          msg: 'received_at for GuardianMetaMessage should have type Date'
        }
      }
    },
    sent_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
      validate: {
        isDate: {
          msg: 'sent_at for GuardianMetaMessage should have type Date'
        }
      }
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true
    },
    body: {
      type: DataTypes.STRING,
      allowNull: true
    },
    android_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    }
  }, {
    tableName: 'GuardianMetaMessages'
  })
  GuardianMetaMessage.associate = function (models) {
    GuardianMetaMessage.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' })
  }
  return GuardianMetaMessage
}

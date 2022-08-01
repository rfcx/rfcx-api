'use strict'

module.exports = function (sequelize, DataTypes) {
  const GuardianSoftwarePrefs = sequelize.define('GuardianSoftwarePrefs', {
    pref_key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false
    },
    pref_value: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false
    }
  }, {
    tableName: 'GuardianSoftwarePrefs'
  })
  GuardianSoftwarePrefs.associate = function (models) {
    GuardianSoftwarePrefs.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' })
  }
  return GuardianSoftwarePrefs
}

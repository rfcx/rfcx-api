'use strict'

module.exports = function (sequelize, DataTypes) {
  const SpeciesName = sequelize.define('SpeciesName', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    rank: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    indexes: [
      { unique: true, fields: ['name'] }
    ],
    tableName: 'SpeciesNames'
  })

  return SpeciesName
}

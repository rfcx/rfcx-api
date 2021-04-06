'use strict'

module.exports = function (sequelize, DataTypes) {
  const GuardianGroupRelation = sequelize.define('GuardianGroupRelation', {}, {
    tableName: 'GuardianGroupRelations'
  })

  return GuardianGroupRelation
}

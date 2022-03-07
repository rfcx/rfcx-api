'use strict'

module.exports = function (sequelize, DataTypes) {
  const UserSiteRelation = sequelize.define('UserSiteRelation', {}, {
    tableName: 'UserSiteRelations'
  })

  return UserSiteRelation
}

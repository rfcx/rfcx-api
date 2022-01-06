'use strict'

module.exports = function (sequelize, DataTypes) {
  const ReportAttachmentRelation = sequelize.define('ReportAttachmentRelation', {}, {
    tableName: 'ReportAttachmentRelations'
  })

  return ReportAttachmentRelation
}

"use strict";

module.exports = function(sequelize, DataTypes) {
  var ReportAttachmentRelation = sequelize.define("ReportAttachmentRelation", {}, {
    tableName: "ReportAttachmentRelations"
  });

  return ReportAttachmentRelation;
};

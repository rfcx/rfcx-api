"use strict";

module.exports = function(sequelize, DataTypes) {
  var Attachment = sequelize.define("Attachment", {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      unique: true
    },
    reported_at: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: true
      }
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  }, {
    classMethods: {
      associate: function(models) {
        Attachment.belongsTo(models.AttachmentType, { as: "Type", foreignKey: "type_id" });
        Attachment.belongsTo(models.User, { as: "User", foreignKey: "user_id"} );
        Attachment.belongsToMany(models.Report, { through: models.ReportAttachmentRelation });
      },
      indexes: [
        {
          unique: true,
          fields: ["guid"]
        }
      ]
    },
    tableName: "Attachments"
  });

  return Attachment;
};

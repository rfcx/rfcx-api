'use strict';
module.exports = (sequelize, DataTypes) => {
  const Annotation = sequelize.define('Annotation', {
    streamId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    start: {
      type: DataTypes.DATE(3),
      allowNull: false,
      validate: {
        isDate: { msg: "'start' for Detection should have type Date" }
      }
    },
    end: {
      type: DataTypes.DATE(3),
      allowNull: false,
      validate: {
        isDate: { msg: "'end' for Detection should have type Date" }
      }
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: false
    },
    updatedBy: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    indexes: [
      { fields: ["streamId"] }
    ],
    tableName: "Annotations"
  });
  Annotation.associate = function (models) {
    Annotation.belongsTo(models.Classification, { as: 'classification', foreignKey: 'classificationId' });
  };
  Annotation.attributes = {
    full: ['id', 'streamId', 'classificationId', 'start', 'end', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy'],
    lite: ['id', 'streamId', 'classificationId', 'start', 'end']
  }
  return Annotation;
};
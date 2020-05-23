'use strict';
module.exports = (sequelize, DataTypes) => {
  const Annotation = sequelize.define('Annotation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true
    },
    streamId: {
      type: DataTypes.STRING(36),
      allowNull: false
    },
    classificationId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    start: {
      // Hypertable key
      type: DataTypes.DATE(3),
      allowNull: false,
      primaryKey: true
    },
    end: {
      type: DataTypes.DATE(3),
      allowNull: false
    },
    frequencyMin: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    frequencyMax: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    indexes: [
      { fields: ["stream_id"] }
    ]
  });
  Annotation.attributes = {
    full: ['id', 'streamId', 'classificationId', 'start', 'end', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy'],
    lite: ['id', 'streamId', 'classificationId', 'start', 'end']
  }
  return Annotation;
};
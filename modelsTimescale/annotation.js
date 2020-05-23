'use strict';
module.exports = (sequelize, DataTypes) => {
  const Annotation = sequelize.define('Annotation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      unique: true,
      primaryKey: true
    },
    streamId: {
      type: DataTypes.STRING(32),
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
      type: DataTypes.STRING(32),
      allowNull: false
    },
    updatedBy: {
      type: DataTypes.STRING(32),
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
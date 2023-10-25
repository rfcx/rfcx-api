module.exports = (sequelize, DataTypes) => {
  const Annotation = sequelize.define('Annotation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true
    },
    stream_id: {
      type: DataTypes.STRING(12),
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
    frequency_min: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    frequency_max: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    classification_id: {
      type: DataTypes.INTEGER
    },
    created_by_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    updated_by_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  })
  Annotation.associate = function (models) {
    Annotation.belongsTo(models.Stream, { as: 'stream', foreignKey: 'stream_id' })
    Annotation.belongsTo(models.Classification, { as: 'classification', foreignKey: 'classification_id' })
    Annotation.belongsTo(models.User, { as: 'created_by', foreignKey: 'created_by_id' })
    Annotation.belongsTo(models.User, { as: 'updated_by', foreignKey: 'updated_by_id' })
  }
  Annotation.attributes = {
    full: ['id', 'stream_id', 'start', 'end', 'frequency_min', 'frequency_max', 'created_at', 'updated_at'],
    lite: ['id', 'stream_id', 'start', 'end', 'frequency_min', 'frequency_max']
  }
  return Annotation
}

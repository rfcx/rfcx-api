module.exports = (sequelize, DataTypes) => {
  const Event = sequelize.define('Event', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true
    },
    start: {
      type: DataTypes.DATE(3),
      allowNull: false,
      primaryKey: true
    },
    end: {
      type: DataTypes.DATE(3),
      allowNull: false
    },
    streamId: {
      type: DataTypes.STRING(12),
      allowNull: false
    },
    classificationId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    classifierEventStrategyId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    firstDetectionId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    lastDetectionId: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    underscored: true
  })
  Event.associate = function (models) {
    Event.belongsTo(models.Stream, { as: 'stream', foreignKey: 'stream_id' })
    Event.belongsTo(models.Classification, { as: 'classification', foreignKey: 'classification_id' })
  }
  Event.attributes = {
    full: ['id', 'stream_id', 'start', 'end', 'created_at', 'updated_at'],
    lite: ['id', 'stream_id', 'start', 'end']
  }
  return Event
}

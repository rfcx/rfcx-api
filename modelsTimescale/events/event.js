module.exports = (sequelize, DataTypes) => {
  const Event = sequelize.define('Event', {
    id: {
      type: DataTypes.STRING(12),
      allowNull: false,
      primaryKey: true
    },
    stream_id: {
      type: DataTypes.STRING(12),
      allowNull: false
    },
    classification_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    classifier_event_strategy_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    start: {
      type: DataTypes.DATE,
      allowNull: false
    },
    end: {
      type: DataTypes.DATE,
      allowNull: false
    },
    start_detection_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false
    },
    end_detection_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false
    }
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

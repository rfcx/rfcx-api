module.exports = (sequelize, DataTypes) => {
  const Detection = sequelize.define('Detection', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true
    },
    start: {
      // Hypertable key
      type: DataTypes.DATE(3),
    },
    end: {
      type: DataTypes.DATE(3),
    },
    stream_id: {
      type: DataTypes.STRING(36),
    },
    classifier_id: {
      type: DataTypes.INTEGER,
    },
    classification_id: {
      type: DataTypes.INTEGER,
    },
    confidence: {
      type: DataTypes.FLOAT
    }
  }, {
    timestamps: false
  })
  Detection.associate = function (models) {
    Detection.belongsTo(models.Classification, { as: 'classification', foreignKey: 'classification_id' })
    Detection.belongsTo(models.Classifier, { as: 'classifier', foreignKey: 'classifier_id' })
  }
  Detection.attributes = {
    lite: ['id', 'stream_id', 'start', 'end', 'confidence'],
    full: ['id', 'stream_id', 'start', 'end', 'confidence']
  }
  return Detection
}
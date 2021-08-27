module.exports = (sequelize, DataTypes) => {
  const Detection = sequelize.define('Detection', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true
    },
    start: {
      // Hypertable key
      type: DataTypes.DATE(3)
    },
    end: {
      type: DataTypes.DATE(3)
    },
    stream_id: {
      type: DataTypes.STRING(12)
    },
    classifier_id: {
      type: DataTypes.INTEGER
    },
    classification_id: {
      type: DataTypes.INTEGER
    },
    confidence: {
      type: DataTypes.FLOAT
    },
    review_status: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    timestamps: false
  })
  Detection.associate = function (models) {
    Detection.belongsTo(models.Stream, { as: 'stream', foreignKey: 'stream_id' })
    Detection.belongsTo(models.Classification, { as: 'classification', foreignKey: 'classification_id' })
    Detection.belongsTo(models.Classifier, { as: 'classifier', foreignKey: 'classifier_id' })
    Detection.hasMany(models.DetectionReview, { as: 'reviews', foreignKey: 'detection_id' })
  }
  Detection.attributes = {
    lite: ['stream_id', 'start', 'end', 'confidence'],
    full: ['id', 'stream_id', 'start', 'end', 'confidence', 'review_status']
  }
  return Detection
}

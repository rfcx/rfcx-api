module.exports = (sequelize, DataTypes) => {
  const Detection = sequelize.define('Detection', {
    start: {
      // Hypertable key
      type: DataTypes.DATE(3),
      primaryKey: true
    },
    end: {
      type: DataTypes.DATE(3)
    },
    streamId: {
      type: DataTypes.STRING(12)
    },
    classifierId: {
      type: DataTypes.INTEGER
    },
    classifierJobId: {
      type: DataTypes.INTEGER
    },
    classificationId: {
      type: DataTypes.INTEGER
    },
    confidence: {
      type: DataTypes.FLOAT
    },
    reviewStatus: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      default: null
    }
  }, {
    underscored: true,
    timestamps: false
  })
  Detection.removeAttribute('id') // https://github.com/sequelize/sequelize/issues/1026#issuecomment-54877327
  Detection.associate = function (models) {
    Detection.belongsTo(models.Stream, { as: 'stream', foreignKey: 'stream_id' })
    Detection.belongsTo(models.Classification, { as: 'classification', foreignKey: 'classification_id' })
    Detection.belongsTo(models.Classifier, { as: 'classifier', foreignKey: 'classifier_id' })
    Detection.belongsTo(models.ClassifierJob, { as: 'classifier_job', foreignKey: 'classifier_job_id' })
    Detection.hasOne(models.BestDetection, { as: 'bestDetection', foreignKey: 'detection_id' })
  }
  Detection.attributes = {
    lite: ['id', 'stream_id', 'start', 'end', 'confidence'], // VERY SCARY CHANGE
    full: ['id', 'stream_id', 'classifier_id', 'classification_id', 'classifier_job_id', 'start', 'end', 'confidence', 'review_status']
  }
  return Detection
}

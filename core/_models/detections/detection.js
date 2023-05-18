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
    stream_id: {
      type: DataTypes.STRING(12)
    },
    classifier_id: {
      type: DataTypes.INTEGER
    },
    classifier_job_id: {
      type: DataTypes.INTEGER
    },
    classification_id: {
      type: DataTypes.INTEGER
    },
    confidence: {
      type: DataTypes.FLOAT
    },
    review_status: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      default: null
    }
  }, {
    timestamps: false
  })
  Detection.removeAttribute('id') // https://github.com/sequelize/sequelize/issues/1026#issuecomment-54877327
  Detection.associate = function (models) {
    Detection.belongsTo(models.Stream, { as: 'stream', foreignKey: 'stream_id' })
    Detection.belongsTo(models.Classification, { as: 'classification', foreignKey: 'classification_id' })
    Detection.belongsTo(models.Classifier, { as: 'classifier', foreignKey: 'classifier_id' })
    Detection.belongsTo(models.ClassifierJob, { as: 'classifier_job', foreignKey: 'classifier_job_id' })
  }
  Detection.attributes = {
    lite: ['stream_id', 'start', 'end', 'confidence'],
    full: ['id', 'stream_id', 'start', 'end', 'confidence', 'review_status']
  }
  return Detection
}

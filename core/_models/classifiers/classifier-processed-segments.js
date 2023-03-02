module.exports = (sequelize, DataTypes) => {
  const ClassifierProcessedSegments = sequelize.define('ClassifierProcessedSegments', {
    start: {
      // Hypertable key
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
    }
  }, {
    timestamps: false,
    underscored: true
  })
  ClassifierProcessedSegments.associate = function (models) {
    ClassifierProcessedSegments.belongsTo(models.Stream, { as: 'stream', foreignKey: 'stream_id' })
    ClassifierProcessedSegments.belongsTo(models.Classifier, { as: 'classifier', foreignKey: 'classifier_id' })
    ClassifierProcessedSegments.belongsTo(models.ClassifierJob, { as: 'classifier_job', foreignKey: 'classifier_job_id' })
  }
  ClassifierProcessedSegments.attributes = {
    lite: ['stream_id', 'start', 'classifier_id', 'classifier_job_id'],
    full: ['stream_id', 'start', 'classifier_id', 'classifier_job_id']
  }
  return ClassifierProcessedSegments
}

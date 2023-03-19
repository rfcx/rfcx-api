module.exports = (sequelize, DataTypes) => {
  const ClassifierProcessedSegment = sequelize.define('ClassifierProcessedSegment', {
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
  ClassifierProcessedSegment.removeAttribute('id') // https://github.com/sequelize/sequelize/issues/1026#issuecomment-54877327
  ClassifierProcessedSegment.associate = function (models) {
    ClassifierProcessedSegment.belongsTo(models.Stream, { as: 'stream', foreignKey: 'stream_id' })
    ClassifierProcessedSegment.belongsTo(models.Classifier, { as: 'classifier', foreignKey: 'classifier_id' })
    ClassifierProcessedSegment.belongsTo(models.ClassifierJob, { as: 'classifier_job', foreignKey: 'classifier_job_id' })
  }
  ClassifierProcessedSegment.attributes = {
    lite: ['stream_id', 'start', 'classifier_id', 'classifier_job_id'],
    full: ['stream_id', 'start', 'classifier_id', 'classifier_job_id']
  }
  return ClassifierProcessedSegment
}

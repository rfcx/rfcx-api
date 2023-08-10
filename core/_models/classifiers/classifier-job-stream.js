module.exports = (sequelize, DataTypes) => {
  const ClassifierJobStream = sequelize.define('ClassifierJobStream', {
    classifierJobId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    streamId: {
      type: DataTypes.STRING(12),
      allowNull: false,
      primaryKey: true
    }
  }, {
    underscored: true,
    timestamps: false
  })
  ClassifierJobStream.associate = function (models) {
    ClassifierJobStream.belongsTo(models.ClassifierJob, { as: 'classifier_job', foreignKey: 'classifier_job_id' })
    ClassifierJobStream.belongsTo(models.Stream, { as: 'stream', foreignKey: 'stream_id' })
  }
  // ClassifierJobStream.attributes = {
  //   full: ['classifier_job_id', 'stream_id'],
  //   lite: ['classifier_job_id', 'stream_id']
  // }
  return ClassifierJobStream
}

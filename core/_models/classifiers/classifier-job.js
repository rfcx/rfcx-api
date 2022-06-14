const includeBuilder = require('../../_utils/db/include-builder')

module.exports = (sequelize, DataTypes) => {
  const ClassifierJob = sequelize.define('ClassifierJob', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true
    },
    classifierId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    projectId: {
      type: DataTypes.STRING(12),
      allowNull: false
    },
    queryStreams: {
      type: DataTypes.STRING,
      allowNull: true
    },
    queryStart: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    queryEnd: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    queryHours: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    segmentsTotal: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    segmentsCompleted: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    status: { // 0 waiting, 20 running, 30 done, 40 error, 50 cancelled
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    createdById: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    underscored: true
  })
  ClassifierJob.associate = function (models) {
    ClassifierJob.belongsTo(models.Classifier, { as: 'classifier', foreignKey: 'classifier_id' })
    ClassifierJob.belongsTo(models.Project, { as: 'project', foreignKey: 'project_id' })
    ClassifierJob.belongsTo(models.User, { as: 'created_by', foreignKey: 'created_by_id' })
  }
  ClassifierJob.attributes = {
    full: [
      'id',
      'classifier_id',
      'project_id',
      'query_streams',
      'query_start',
      'query_end',
      'query_hours',
      'segments_total',
      'segments_completed',
      'status',
      'created_by_id',
      'created_at',
      'updated_at',
      'started_at',
      'completed_at'
    ],
    lite: ['id', 'classifier_id', 'project_id', 'segments_completed', 'segments_total', 'created_by_id', 'created_at', 'completed_at']
  }
  ClassifierJob.include = includeBuilder(ClassifierJob, 'classifier_job', ClassifierJob.attributes.lite)
  return ClassifierJob
}

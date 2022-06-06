const includeBuilder = require('../../_utils/db/include-builder')

module.exports = (sequelize, DataTypes) => {
  const ClassifierJobs = sequelize.define('ClassifierJobs', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true
    },
    projectId: {
      type: DataTypes.STRING(12),
      allowNull: false,
      primaryKey: true
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
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      allowNull: true
    },
    segmentsTotal: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    segmentsCompleted: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: { // 10 waiting, 20 running, 30 done, 40 error
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    createdById: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updatedAt: {
      type: DataTypes.DATE,
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
    underscored: true,
    timestamps: false
  })
  ClassifierJobs.associate = function (models) {
    ClassifierJobs.belongsTo(models.Project, { as: 'project', foreignKey: 'project_id' })
    ClassifierJobs.belongsTo(models.User, { as: 'created_by', foreignKey: 'created_by_id' })
  }
  ClassifierJobs.attributes = {
    full: [
      'id',
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
    lite: ['id', 'project_id', 'segments_completed', 'segments_total', 'created_by_id', 'created_at', 'completed_at']
  }
  ClassifierJobs.include = includeBuilder(ClassifierJobs, 'classifier_jobs', ClassifierJobs.attributes.lite)
  return ClassifierJobs
}

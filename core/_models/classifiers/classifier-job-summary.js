module.exports = (sequelize, DataTypes) => {
  const ClassifierJobSummary = sequelize.define('ClassifierJobSummary', {
    classifierJobId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    classificationId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    total: {
      type: DataTypes.INTEGER,
      default: 0
    },
    confirmed: {
      type: DataTypes.INTEGER,
      default: 0
    },
    rejected: {
      type: DataTypes.INTEGER,
      default: 0
    },
    uncertain: {
      type: DataTypes.INTEGER,
      default: 0
    }
  }, {
    underscored: true,
    timestamps: false
  })
  ClassifierJobSummary.removeAttribute('id') // https://github.com/sequelize/sequelize/issues/1026#issuecomment-54877327
  ClassifierJobSummary.associate = function (models) {
    ClassifierJobSummary.belongsTo(models.ClassifierJob, { as: 'classifier_job', foreignKey: 'classifier_job_id' })
    ClassifierJobSummary.belongsTo(models.Classification, { as: 'classification', foreignKey: 'classification_id' })
  }
  ClassifierJobSummary.attributes = {
    full: ['classifier_job_id', 'classification_id', 'total', 'confirmed', 'rejected', 'uncertain'],
    lite: ['total', 'confirmed', 'rejected', 'uncertain']
  }
  return ClassifierJobSummary
}

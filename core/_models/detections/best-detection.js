module.exports = (sequelize, DataTypes) => {
  const BestDetection = sequelize.define('BestDetection', {
    detectionId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    start: {
      type: DataTypes.DATE(3),
      allowNull: true
    },
    streamId: {
      type: DataTypes.STRING(12),
      allowNull: false
    },
    classifierJobId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    confidence: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    classificationId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    streamRanking: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    streamDailyRanking: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    streamClassificationRanking: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    streamClassificationDailyRanking: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    underscored: true,
    timestamps: false
  })
  BestDetection.associate = function (models) {
    BestDetection.belongsTo(models.Detection, { as: 'detection', foreignKey: 'detection_id' })
    BestDetection.belongsTo(models.ClassifierJob, { as: 'classifier_job', foreignKey: 'classifier_job_id' })
    BestDetection.belongsTo(models.Classification, { as: 'classification', foreignKey: 'classification_id' })
  }
  return BestDetection
}

module.exports = (sequelize, DataTypes) => {
  const DetectionReview = sequelize.define('DetectionReview', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true
    },
    detectionId: {
      type: DataTypes.UUID
    },
    userId: {
      type: DataTypes.INTEGER
    },
    positive: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      default: null
    }
  }, {
    underscored: true
  })
  DetectionReview.associate = function (models) {
    DetectionReview.belongsTo(models.Detection, { as: 'detection', foreignKey: 'detection_id' })
    DetectionReview.belongsTo(models.User, { as: 'user', foreignKey: 'user_id' })
  }
  DetectionReview.attributes = {
    lite: ['id', 'detection_id', 'positive'],
    full: ['id', 'detection_id', 'user_id', 'positive', 'created_at', 'updated_at']
  }
  return DetectionReview
}

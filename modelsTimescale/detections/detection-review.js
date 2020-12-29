module.exports = function (sequelize, DataTypes) {
  const DetectionReview = sequelize.define('DetectionReview', {
    detection_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    positive: {
      type: DataTypes.BOOLEAN,
      allowNull: false
    }
  }, {
    timestamps: true
  })
  DetectionReview.associate = function (models) {
    DetectionReview.belongsTo(models.Detection, { as: 'detection', foreignKey: 'detection_id' })
    DetectionReview.belongsTo(models.User, { as: 'user', foreignKey: 'user_id' })
  }
  DetectionReview.attributes = {
    full: ['detection_id', 'user_id', 'positive', 'created_at', 'updated_at'],
    lite: ['user_id', 'positive', 'created_at']
  }
  return DetectionReview
}

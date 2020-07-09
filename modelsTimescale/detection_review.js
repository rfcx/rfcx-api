module.exports = function (sequelize, DataTypes) {
  const DetectionReview = sequelize.define("DetectionReview", {
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
    },
  }, {
    timestamps: true,
  })
  DetectionReview.removeAttribute('id')
  DetectionReview.associate = function (models) {
    DetectionReview.belongsTo(models.Detection, { as: 'detection', foreignKey: 'detection_id' })
    DetectionReview.belongsTo(models.User, { as: 'created_by', foreignKey: 'user_id' })
  }
  DetectionReview.attributes = {
    full: ['detection_id', 'created_by', 'positive', 'created_at', 'updated_at'],
    lite: ['detection_id', 'created_by', 'positive'],
  }
  return DetectionReview
};

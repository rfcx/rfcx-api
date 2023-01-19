const includeBuilder = require('../../_utils/db/include-builder')

module.exports = (sequelize, DataTypes) => {
  const DetectionReview = sequelize.define('DetectionReview', {
    detection_id: {
      type: DataTypes.INTEGER
    },
    user_id: {
      type: DataTypes.INTEGER
    },
    positive: {
      type: DataTypes.BOOLEAN
    }
  }, {
    underscored: true,
    updatedAt: false
  })
  DetectionReview.removeAttribute('id') // https://github.com/sequelize/sequelize/issues/1026#issuecomment-54877327
  DetectionReview.associate = function (models) {
    DetectionReview.belongsTo(models.Detection, { as: 'detection', foreignKey: 'detection_id' })
    DetectionReview.belongsTo(models.User, { as: 'user', foreignKey: 'user_id' })
  }
  DetectionReview.attributes = {
    full: ['detection_id', 'user_id', 'positive', 'created_at'],
    lite: ['positive', 'created_at']
  }
  DetectionReview.include = includeBuilder(DetectionReview, 'reviews', DetectionReview.attributes.lite)

  return DetectionReview
}

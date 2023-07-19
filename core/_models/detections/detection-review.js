/* eslint-disable quote-props */
const includeBuilder = require('../../_utils/db/include-builder')

module.exports = (sequelize, DataTypes) => {
  const DetectionReview = sequelize.define('DetectionReview', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true
    },
    detectionId: {
      type: DataTypes.BIGINT
    },
    userId: {
      type: DataTypes.INTEGER
    },
    status: {
      type: DataTypes.SMALLINT,
      allowNull: false
    }
  }, {
    underscored: true
  })
  DetectionReview.associate = function (models) {
    DetectionReview.belongsTo(models.User, { as: 'user', foreignKey: 'user_id' })
  }
  DetectionReview.attributes = {
    lite: ['id', 'detection_id', 'status'],
    full: ['id', 'detection_id', 'user_id', 'status', 'created_at', 'updated_at']
  }
  DetectionReview.include = includeBuilder(DetectionReview, 'reviews', DetectionReview.attributes.lite)
  DetectionReview.statusMapping = {
    '-1': 'rejected',
    '0': 'uncertain',
    '1': 'confirmed'
  }
  return DetectionReview
}

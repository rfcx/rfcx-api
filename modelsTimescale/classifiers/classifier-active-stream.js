module.exports = (sequelize, DataTypes) => {
  const ClassifierActiveStream = sequelize.define('ClassifierActiveStream', {
    classifierId: {
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
  ClassifierActiveStream.associate = function (models) {
    ClassifierActiveStream.belongsTo(models.Classifier, { as: 'classifier', foreignKey: 'classifier_id' })
    ClassifierActiveStream.belongsTo(models.Stream, { as: 'stream', foreignKey: 'stream_id' })
  }
  ClassifierActiveStream.attributes = {
    full: ['classifier_id', 'stream_id'],
    lite: ['classifier_id', 'stream_id']
  }
  return ClassifierActiveStream
}

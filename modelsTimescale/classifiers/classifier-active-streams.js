module.exports = (sequelize, DataTypes) => {
  const ClassifierActiveStreams = sequelize.define('ClassifierActiveStreams', {
    classifier_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    stream_id: {
      type: DataTypes.STRING(12),
      allowNull: false,
      primaryKey: true
    }
  }, {
    timestamps: false
  })
  ClassifierActiveStreams.associate = function (models) {
    ClassifierActiveStreams.belongsTo(models.Classifier, { as: 'classifier', foreignKey: 'classifier_id' })
    ClassifierActiveStreams.belongsTo(models.Stream, { as: 'stream', foreignKey: 'stream_id' })
  }
  ClassifierActiveStreams.attributes = {
    full: ['classifier_id', 'stream_id'],
    lite: ['classifier_id', 'stream_id']
  }
  return ClassifierActiveStreams
}

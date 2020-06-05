module.exports = (sequelize, DataTypes) => {
  const Classifier = sequelize.define('Classifier', {
    version: {
      type: DataTypes.INTEGER,
    },
  })
  Classifier.associate = function (models) {
  }
  Classifier.attributes = {
    lite: ['version']
  }
  return Classifier
}
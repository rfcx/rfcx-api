const includeBuilder = require('../../utils/sequelize/include-builder')

module.exports = (sequelize, DataTypes) => {
  const ClassifierOutput = sequelize.define('ClassifierOutput', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true
    },
    classifierId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    classificationId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    outputClassName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    ignoreThreshold: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0.5
    }
  }, {
    underscored: true,
    timestamps: false
  })
  ClassifierOutput.associate = function (models) {
    ClassifierOutput.belongsTo(models.Classifier, { as: 'classifier', foreignKey: 'classifier_id' })
    ClassifierOutput.belongsTo(models.User, { as: 'created_by', foreignKey: 'created_by_id' })
  }
  ClassifierOutput.attributes = {
    full: ['classification_id', 'output_class_name', 'ignore_threshold'],
    lite: ['classification_id', 'output_class_name', 'ignore_threshold']
  }
  ClassifierOutput.include = includeBuilder(ClassifierOutput, 'classifier_output', ClassifierOutput.attributes.lite)
  return ClassifierOutput
}

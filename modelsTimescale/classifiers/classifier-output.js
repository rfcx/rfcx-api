module.exports = (sequelize, DataTypes) => {
  const ClassifierOutput = sequelize.define('ClassifierOutput', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true
    },
    classifier_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    classification_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    output_class_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    ignore_threshold: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0.5
    }
  },
  {
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
  ClassifierOutput.include = function (as = 'classifier_output', attributes = ClassifierOutput.attributes.lite, required = true) {
    return { model: ClassifierOutput, as, attributes, required }
  }
  return ClassifierOutput
}

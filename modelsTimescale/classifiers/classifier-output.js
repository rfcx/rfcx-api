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
    ignore: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
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
    full: ['classification_id', 'output_class_name', 'ignore'],
    lite: ['classification_id', 'output_class_name', 'ignore']
  }
  return ClassifierOutput
}

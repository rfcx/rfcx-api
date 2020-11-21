module.exports = (sequelize, DataTypes) => {
  const ClassifierDeployment = sequelize.define('ClassifierDeployment', {
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
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    status: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    start: {
      type: DataTypes.DATE(3),
      allowNull: false
    },
    end: {
      type: DataTypes.DATE(3)
    },
    created_by_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    deployment_parameters: {
      type: DataTypes.STRING
    }
  })
  ClassifierDeployment.associate = function (models) {
    ClassifierDeployment.belongsTo(models.Classifier, { as: 'classifier', foreignKey: 'classifier_id' })
    ClassifierDeployment.belongsTo(models.User, { as: 'created_by', foreignKey: 'created_by_id' })
  }
  ClassifierDeployment.attributes = {
    full: ['name', 'version', 'status', 'external_reference', 'prediction_parameters'],
    lite: ['name', 'version', 'status', 'external_reference']
  }
  return ClassifierDeployment
}

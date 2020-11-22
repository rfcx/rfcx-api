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
    active: { // true when this is the active (current) deployment for a given classifier
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    status: { // 10 staging, 20 production, 90 retired
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    start: { // when this deployment should start
      type: DataTypes.DATE(3),
      allowNull: false
    },
    end: { // when this deployment should end
      type: DataTypes.DATE(3)
    },
    created_by_id: { // who initiated the deployment
      type: DataTypes.INTEGER,
      allowNull: false
    },
    deployment_parameters: { // prediction service parameters specific to the deployment (e.g. step seconds)
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

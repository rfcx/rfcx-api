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
    deployed: { // true when this is the deployed classifier to the prediction deployer
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
    platform: { // deploy platform e.g. aws, hwc
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'aws'
    },
    deployment_parameters: { // prediction service parameters specific to the deployment (e.g. step seconds)
      type: DataTypes.STRING
    }
  }, {
    timestamps: false
  })
  ClassifierDeployment.associate = function (models) {
    ClassifierDeployment.belongsTo(models.Classifier, { as: 'classifier', foreignKey: 'classifier_id' })
    ClassifierDeployment.belongsTo(models.User, { as: 'created_by', foreignKey: 'created_by_id' })
  }
  ClassifierDeployment.attributes = {
    full: ['id', 'classifier_id', 'deployed', 'status', 'start', 'end', 'platform', 'deployment_parameters'],
    lite: ['id', 'deployed', 'status', 'start', 'end']
  }
  return ClassifierDeployment
}

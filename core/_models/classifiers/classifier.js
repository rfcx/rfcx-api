const includeBuilder = require('../../_utils/db/include-builder')

module.exports = (sequelize, DataTypes) => {
  const Classifier = sequelize.define('Classifier', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    externalId: {
      type: DataTypes.STRING
    },
    createdById: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    modelRunner: {
      type: DataTypes.STRING,
      allowNull: false
    },
    modelUrl: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lastExecutedAt: {
      type: DataTypes.DATE(3)
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    parameters: {
      type: DataTypes.STRING(255)
    }
  }, {
    underscored: true
  })
  Classifier.associate = function (models) {
    Classifier.hasMany(models.ClassifierDeployment, { as: 'deployments', foreignKey: 'classifier_id' })
    Classifier.hasMany(models.ClassifierOutput, { as: 'outputs', foreignKey: 'classifier_id' })
    Classifier.belongsTo(models.User, { as: 'created_by', foreignKey: 'created_by_id' })
    Classifier.belongsToMany(models.Stream, { as: 'active_streams', through: 'classifier_active_streams', timestamps: false })
    Classifier.belongsToMany(models.Project, { as: 'active_projects', through: 'classifier_active_projects', timestamps: false })
  }
  Classifier.attributes = {
    full: ['id', 'name', 'version', 'external_id', 'model_runner', 'model_url', 'last_executed_at', 'parameters'],
    lite: ['id', 'name', 'version', 'last_executed_at']
  }
  Classifier.include = includeBuilder(Classifier, 'classifier', Classifier.attributes.lite)
  return Classifier
}

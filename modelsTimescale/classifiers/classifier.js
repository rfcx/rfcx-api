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
    external_id: {
      type: DataTypes.STRING
    },
    created_by_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    model_runner: {
      type: DataTypes.STRING,
      allowNull: false
    },
    model_url: {
      type: DataTypes.STRING,
      allowNull: false
    },
    last_executed_at: {
      type: DataTypes.DATE(3)
    }
  },
  {
    timestamps: true
  })
  Classifier.associate = function (models) {
    Classifier.hasMany(models.ClassifierDeployment, { as: 'deployments', foreignKey: 'classifier_id' })
    Classifier.hasMany(models.ClassifierOutput, { as: 'outputs', foreignKey: 'classifier_id' })
    Classifier.belongsTo(models.User, { as: 'created_by', foreignKey: 'created_by_id' })
    Classifier.belongsToMany(models.Stream, { as: 'active_streams', through: 'classifier_active_streams' })
    // Classifier.belongsToMany(models.Project, { as: 'active_projects', through: 'classifier_active_projects' })
  }
  Classifier.attributes = {
    full: ['name', 'version', 'status', 'external_reference', 'last_executed_at'],
    lite: ['name', 'version', 'status']
  }
  return Classifier
}

module.exports = (sequelize, DataTypes) => {
  const ClassifierActiveProjects = sequelize.define('ClassifierActiveProjects', {
    classifier_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    project_id: {
      type: DataTypes.STRING(12),
      allowNull: false,
      primaryKey: true
    }
  }, {
    timestamps: false
  })
  ClassifierActiveProjects.associate = function (models) {
    ClassifierActiveProjects.belongsTo(models.Classifier, { as: 'classifier', foreignKey: 'classifier_id' })
    ClassifierActiveProjects.belongsTo(models.Project, { as: 'project', foreignKey: 'project_id' })
  }
  ClassifierActiveProjects.attributes = {
    full: ['classifier_id', 'project_id'],
    lite: ['classifier_id', 'project_id']
  }
  return ClassifierActiveProjects
}

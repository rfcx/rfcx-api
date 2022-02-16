module.exports = (sequelize, DataTypes) => {
  const ClassifierActiveProject = sequelize.define('ClassifierActiveProject', {
    classifierId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    projectId: {
      type: DataTypes.STRING(12),
      allowNull: false,
      primaryKey: true
    }
  }, {
    underscored: true,
    timestamps: false
  })
  ClassifierActiveProject.associate = function (models) {
    ClassifierActiveProject.belongsTo(models.Classifier, { as: 'classifier', foreignKey: 'classifier_id' })
    ClassifierActiveProject.belongsTo(models.Project, { as: 'project', foreignKey: 'project_id' })
  }
  ClassifierActiveProject.attributes = {
    full: ['classifier_id', 'project_id'],
    lite: ['classifier_id', 'project_id']
  }
  return ClassifierActiveProject
}

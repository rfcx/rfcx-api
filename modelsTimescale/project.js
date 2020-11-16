module.exports = function (sequelize, DataTypes) {
  const Project = sequelize.define('Project', {
    id: {
      type: DataTypes.STRING(12),
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    organization_id: {
      type: DataTypes.STRING(12),
      allowNull: true
    },
    created_by_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  })
  Project.associate = function (models) {
    Project.belongsTo(models.User, { as: 'created_by', foreignKey: 'created_by_id' })
    Project.belongsTo(models.Organization, { as: 'organization', foreignKey: 'organization_id' })
  }
  Project.attributes = {
    full: ['id', 'name', 'created_by_id', 'organization_id', 'created_at', 'updated_at'],
    lite: ['id', 'name']
  }
  return Project
}

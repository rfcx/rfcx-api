const includeBuilder = require('../../utils/sequelize/include-builder')

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
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    organizationId: {
      type: DataTypes.STRING(12),
      allowNull: true
    },
    createdById: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    externalId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    isPartner: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    }
  }, {
    paranoid: true,
    underscored: true
  })
  Project.associate = function (models) {
    Project.belongsTo(models.User, { as: 'created_by', foreignKey: 'created_by_id' })
    Project.belongsTo(models.Organization, { as: 'organization', foreignKey: 'organization_id' })
    Project.hasMany(models.Stream, { as: 'streams', foreignKey: 'project_id' })
  }
  Project.attributes = {
    full: ['id', 'name', 'is_public', 'created_by_id', 'organization_id', 'external_id', 'is_partner', 'created_at', 'updated_at'],
    lite: ['id', 'name', 'is_public', 'external_id']
  }
  Project.include = includeBuilder(Project, 'project', Project.attributes.lite)
  return Project
}

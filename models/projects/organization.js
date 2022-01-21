const includeBuilder = require('../../core/_utils/db/include-builder')

module.exports = function (sequelize, DataTypes) {
  const Organization = sequelize.define('Organization', {
    id: {
      type: DataTypes.STRING(12),
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      unique: true
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    createdById: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    paranoid: true,
    underscored: true
  })
  Organization.associate = function (models) {
    Organization.belongsTo(models.User, { as: 'created_by', foreignKey: 'created_by_id' })
    Organization.hasMany(models.Project, { as: 'projects', foreignKey: 'organization_id' })
  }
  Organization.attributes = {
    full: ['id', 'name', 'is_public', 'created_at', 'updated_at'],
    lite: ['id', 'name', 'is_public']
  }
  Organization.include = includeBuilder(Organization, 'organization', Organization.attributes.lite)
  return Organization
}

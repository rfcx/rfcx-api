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
    is_public: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    }
  }, {
    paranoid: true,
    timestamps: true,
    deletedAt: 'deleted_at'
  })
  Organization.associate = function (models) {
    Organization.belongsTo(models.User, { as: 'created_by', foreignKey: 'created_by_id' })
    Organization.hasMany(models.Project, { as: 'projects', foreignKey: 'organization_id' })
  }
  Organization.attributes = {
    full: ['id', 'name', 'is_public', 'created_by_id', 'created_at', 'updated_at'],
    lite: ['id', 'name', 'is_public']
  }
  const includeBase = { model: Organization, as: 'organization' }
  Organization.asInclude = {
    full: { ...includeBase, attributes: Organization.attributes.full },
    lite: { ...includeBase, attributes: Organization.attributes.lite }
  }
  return Organization
}

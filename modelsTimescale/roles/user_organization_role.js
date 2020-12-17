module.exports = function (sequelize, DataTypes) {
  const UserOrganizationRole = sequelize.define('UserOrganizationRole', {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    organization_id: {
      type: DataTypes.STRING(12),
      allowNull: false,
      primaryKey: true
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    }
  })
  UserOrganizationRole.associate = function (models) {
    UserOrganizationRole.belongsTo(models.User, { as: 'user', foreign_key: 'user_id' })
    UserOrganizationRole.belongsTo(models.Organization, { as: 'organization', foreign_key: 'organization_id' })
    UserOrganizationRole.belongsTo(models.Role, { as: 'role', foreign_key: 'role_id' })
  }
  UserOrganizationRole.attributes = {
    full: ['user_id', 'organization_id', 'role_id'],
    lite: ['user_id', 'organization_id', 'role_id']
  }
  return UserOrganizationRole
}

module.exports = function (sequelize, DataTypes) {
  const UserOrganizationRole = sequelize.define('UserOrganizationRole', {
  })
  UserOrganizationRole.associate = function (models) {
    UserOrganizationRole.belongsTo(models.Role, { as: 'role', foreign_key: 'role_id' })
  }
  UserOrganizationRole.attributes = {
    full: ['user_id', 'organization_id', 'role_id'],
    lite: ['user_id', 'organization_id', 'role_id']
  }
  return UserOrganizationRole
}

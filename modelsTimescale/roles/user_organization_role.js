module.exports = function (sequelize, DataTypes) {
  const UserOrganizationRole = sequelize.define('UserOrganizationRole', {
  })
  UserOrganizationRole.associate = function (models) {
  }
  UserOrganizationRole.attributes = {
    full: ['user_id', 'organization_id', 'role_id'],
    lite: ['user_id', 'organization_id', 'role_id']
  }
  return UserOrganizationRole
}

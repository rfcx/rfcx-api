module.exports = function (sequelize, DataTypes) {
  const UserProjectRole = sequelize.define('UserProjectRole', {
  })
  UserProjectRole.associate = function (models) {
  }
  UserProjectRole.attributes = {
    full: ['user_id', 'project_id', 'role_id'],
    lite: ['user_id', 'project_id', 'role_id']
  }
  return UserProjectRole
}

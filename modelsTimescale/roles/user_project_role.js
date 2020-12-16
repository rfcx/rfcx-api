module.exports = function (sequelize, DataTypes) {
  const UserProjectRole = sequelize.define('UserProjectRole', {
  })
  UserProjectRole.associate = function (models) {
    UserProjectRole.belongsTo(models.Role, { as: 'role', foreign_key: 'role_id' })
    UserProjectRole.belongsTo(models.Project, { as: 'project', foreign_key: 'project_id' })
  }
  UserProjectRole.attributes = {
    full: ['user_id', 'project_id', 'role_id'],
    lite: ['user_id', 'project_id', 'role_id']
  }
  return UserProjectRole
}

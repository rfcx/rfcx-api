module.exports = function (sequelize, DataTypes) {
  const UserProjectRole = sequelize.define('UserProjectRole', {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    project_id: {
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
  UserProjectRole.associate = function (models) {
    UserProjectRole.belongsTo(models.User, { as: 'user', foreign_key: 'user_id' })
    UserProjectRole.belongsTo(models.Project, { as: 'project', foreign_key: 'project_id' })
    UserProjectRole.belongsTo(models.Role, { as: 'role', foreign_key: 'role_id' })
  }
  UserProjectRole.attributes = {
    full: ['user_id', 'project_id', 'role_id'],
    lite: ['user_id', 'project_id', 'role_id']
  }
  return UserProjectRole
}

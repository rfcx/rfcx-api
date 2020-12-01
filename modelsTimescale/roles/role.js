module.exports = function (sequelize, DataTypes) {
  const Role = sequelize.define('Role', {
    name: {
      type: DataTypes.STRING,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  })
  Role.associate = function (models) {
    Role.hasMany(models.RolePermission, { as: 'permissions', foreign_key: 'role_id' })
  }
  Role.attributes = {
    full: ['id', 'name', 'description'],
    lite: ['id', 'name']
  }
  return Role
}

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
    Role.belongsToMany(models.Permission, { through: models.RolePermission })
  }
  Role.attributes = {
    full: ['id', 'name', 'description'],
    lite: ['id', 'name']
  }
  return Role
}

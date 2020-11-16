module.exports = function (sequelize, DataTypes) {
  const Permission = sequelize.define('Permission', {
    id: {
      type: DataTypes.STRING(1),
      unique: true,
      primaryKey: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  })
  Permission.associate = function (models) {
    Permission.belongsToMany(models.Role, { through: models.RolePermission })
  }
  Permission.attributes = {
    full: ['id', 'description'],
    lite: ['id', 'description']
  }
  return Permission
}

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
  }, {
    timestamps: false
  })
  Role.associate = function (models) {
    Role.hasMany(models.RolePermission, { as: 'permissions' })
  }
  Role.attributes = {
    full: ['id', 'name', 'description'],
    lite: ['id', 'name']
  }
  return Role
}

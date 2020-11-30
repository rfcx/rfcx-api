module.exports = function (sequelize, DataTypes) {
  const RolePermission = sequelize.define('RolePermission', {
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    permission: {
      type: DataTypes.STRING(1),
      allowNull: false
    }
  }, {
    timestamps: false
  })
  RolePermission.removeAttribute('id')
  RolePermission.associate = function (models) {
    RolePermission.belongsTo(models.Role, { foreign_key: 'role_id' })
  }
  RolePermission.attributes = {
    full: ['role_id', 'permission'],
    lite: ['role_id', 'permission']
  }
  return RolePermission
}

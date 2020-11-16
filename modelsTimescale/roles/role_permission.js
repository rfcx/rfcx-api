module.exports = function (sequelize, DataTypes) {
  const RolePermission = sequelize.define('RolePermission', {
  })
  RolePermission.associate = function (models) {
  }
  RolePermission.attributes = {
    full: ['role_id', 'permission_id'],
    lite: ['role_id', 'permission_id']
  }
  return RolePermission
}

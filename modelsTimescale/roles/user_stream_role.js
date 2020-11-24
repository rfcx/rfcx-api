module.exports = function (sequelize, DataTypes) {
  const UserStreamRole = sequelize.define('UserStreamRole', {
  })
  UserStreamRole.associate = function (models) {
    UserStreamRole.belongsTo(models.Role, { as: 'role', foreign_key: 'role_id' })
  }
  UserStreamRole.attributes = {
    full: ['user_id', 'stream_id', 'role_id'],
    lite: ['user_id', 'stream_id', 'role_id']
  }
  return UserStreamRole
}

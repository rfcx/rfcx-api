module.exports = function (sequelize, DataTypes) {
  const UserStreamRole = sequelize.define('UserStreamRole', {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    stream_id: {
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
  UserStreamRole.associate = function (models) {
    UserStreamRole.belongsTo(models.User, { as: 'user', foreign_key: 'user_id' })
    UserStreamRole.belongsTo(models.Stream, { as: 'stream', foreign_key: 'stream_id' })
    UserStreamRole.belongsTo(models.Role, { as: 'role', foreign_key: 'role_id' })
  }
  UserStreamRole.attributes = {
    full: ['user_id', 'stream_id', 'role_id'],
    lite: ['user_id', 'stream_id', 'role_id']
  }
  return UserStreamRole
}

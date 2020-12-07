module.exports = function (sequelize, DataTypes) {
  const RolePermission = sequelize.define('RolePermission', {
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true // https://github.com/sequelize/sequelize/issues/5193#issuecomment-736230201
    },
    permission: {
      type: DataTypes.STRING(1),
      allowNull: false,
      primaryKey: true // https://github.com/sequelize/sequelize/issues/5193#issuecomment-736230201
    }
  }, {
    timestamps: false
  })
  RolePermission.removeAttribute('id')
  RolePermission.associate = function (models) {
  }
  RolePermission.attributes = {
    full: ['role_id', 'permission'],
    lite: ['role_id', 'permission']
  }
  return RolePermission
}

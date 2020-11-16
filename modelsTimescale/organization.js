module.exports = function (sequelize, DataTypes) {
  const Organization = sequelize.define('Organization', {
    id: {
      type: DataTypes.STRING(12),
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      unique: true
    }
  })
  Organization.associate = function (models) {
    Organization.belongsTo(models.User, { as: 'created_by', foreignKey: 'created_by_id' })
  }
  Organization.attributes = {
    full: ['id', 'name', 'created_by_id', 'created_at', 'updated_at'],
    lite: ['id', 'name']
  }
  return Organization
}

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
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    }
  }, {
    paranoid: true,
    timestamps: true,
    deletedAt: 'deleted_at'
  })
  Organization.associate = function (models) {
    Organization.belongsTo(models.User, { as: 'created_by', foreignKey: 'created_by_id' })
  }
  Organization.attributes = {
    full: ['id', 'name', 'is_public', 'created_by_id', 'created_at', 'updated_at'],
    lite: ['id', 'name', 'is_public']
  }
  return Organization
}

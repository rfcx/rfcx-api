module.exports = (sequelize, DataTypes) => {
  const IndexType = sequelize.define('IndexType', {
    name: {
      type: DataTypes.STRING(64)
    }
  }, {
    timestamps: false
  })
  IndexType.associate = function (models) {
    IndexType.hasMany(models.Index, { as: 'indices', foreignKey: 'type_id' })
  }
  IndexType.attributes = {
    lite: ['name']
  }
  return IndexType
}

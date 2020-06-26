module.exports = (sequelize, DataTypes) => {
  const Index = sequelize.define('Index', {
    code: {
      type: DataTypes.STRING(8),
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    range_min: {
      type: DataTypes.FLOAT
    },
    range_max: {
      type: DataTypes.FLOAT
    }
  }, {
    timestamps: false,
  })
  Index.associate = function (models) {
    Index.belongsTo(models.IndexType, { as: 'type', foreignKey: 'type_id' })
  }
  Index.attributes = {
    lite: ['id', 'code', 'name']
  }
  return Index
}

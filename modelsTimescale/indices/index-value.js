module.exports = (sequelize, DataTypes) => {
  const IndexValue = sequelize.define('IndexValue', {
    time: {
      type: DataTypes.DATE(3),
    },
    stream_id: {
      type: DataTypes.STRING(12),
    },
    type_id: {
      type: DataTypes.INTEGER,
    },
    value: {
      type: DataTypes.FLOAT
    }
  }, {
    timestamps: false,
  })
  IndexValue.removeAttribute('id')
  IndexValue.associate = function (models) {
    IndexValue.belongsTo(models.Stream, { as: 'stream', foreignKey: 'stream_id' })
    IndexValue.belongsTo(models.Index, { as: 'index', foreignKey: 'index_id' })
  }
  IndexValue.attributes = {
    lite: ['time', 'value']
  }
  return IndexValue
}

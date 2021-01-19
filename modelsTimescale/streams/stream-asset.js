module.exports = function (sequelize, DataTypes) {
  const StreamAsset = sequelize.define('StreamAsset', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true
    },
    streamId: {
      type: DataTypes.STRING(12),
      allowNull: false
    },
    type: {
      type: DataTypes.STRING(16),
      allowNull: false
    },
    url: {
      type: DataTypes.STRING(255),
      allowNull: false
    }
  }, {
    underscored: true
  })
  StreamAsset.associate = function (models) {
    StreamAsset.belongsTo(models.Stream, { as: 'stream', foreignKey: 'stream_id' })
  }
  StreamAsset.attributes = {
    full: ['id', 'stream_id', 'type', 'url', 'created_at', 'updated_at'],
    lite: ['id', 'type', 'url', 'created_at']
  }
  return StreamAsset
}

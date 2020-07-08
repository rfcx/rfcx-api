module.exports = function (sequelize, DataTypes) {
  const StreamPermission = sequelize.define("StreamPermission", {
    stream_id: {
      type: DataTypes.STRING(12),
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    organization_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    type: {
      type: DataTypes.STRING(1),
      allowNull: false
    },
  }, {
    timestamps: true,
  })
  StreamPermission.removeAttribute('id')
  StreamPermission.associate = function (models) {
    StreamPermission.belongsTo(models.Stream, { as: 'stream', foreignKey: 'stream_id' })
    StreamPermission.belongsTo(models.User, { as: 'user', foreignKey: 'user_id' })
    StreamPermission.belongsTo(models.Organization, { as: 'organization', foreignKey: 'organization_id' })
  }
  StreamPermission.attributes = {
    full: ['stream_id', 'user_id', 'organization_id', 'type', 'created_at', 'updated_at'],
    lite: ['stream_id', 'user_id', 'organization_id'],
  }
  return StreamPermission
};

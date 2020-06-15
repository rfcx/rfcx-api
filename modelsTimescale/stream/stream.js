module.exports = function (sequelize, DataTypes) {
  const Stream = sequelize.define("Stream", {
    id: {
      type: DataTypes.STRING(12),
      allowNull: false,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    start: {
      type: DataTypes.DATE(3),
      allowNull: true,
    },
    end: {
      type: DataTypes.DATE(3),
      allowNull: true,
    },
    is_private: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    location_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    max_sample_rate_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    created_by_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    timestamps: true,
  })
  Stream.associate = function (models) {
    Stream.belongsTo(models.Location, { as: 'location', foreignKey: 'location_id' })
    Stream.belongsTo(models.SampleRate, { as: 'max_sample_rate', foreignKey: 'max_sample_rate_id' })
    Stream.belongsTo(models.User, { as: 'created_by', foreignKey: 'created_by_id' })
  }
  Stream.attributes = {
    full: ['id', 'name', 'description', 'start', 'end', 'is_private', 'location_id', 'max_sample_rate_id', 'created_by_id', 'created_at', 'updated_at'],
    lite: ['id', 'name', 'start', 'end', 'is_private']
  }
  return Stream
};

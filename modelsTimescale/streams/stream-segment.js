module.exports = function (sequelize, DataTypes) {
  const StreamSegment = sequelize.define('StreamSegment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true
    },
    start: {
      // Hypertable key
      type: DataTypes.DATE(3),
      allowNull: false,
      primaryKey: true
    },
    end: {
      type: DataTypes.DATE(3),
      allowNull: false
    },
    sample_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: {
          args: [1],
          msg: 'sample_count should be greater than 0'
        }
      }
    },
    stream_id: {
      type: DataTypes.STRING(12),
      allowNull: false
    },
    stream_source_file_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    file_extension_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    timestamps: true
  })
  StreamSegment.associate = function (models) {
    StreamSegment.belongsTo(models.Stream, { as: 'stream', foreignKey: 'stream_id' })
    StreamSegment.belongsTo(models.StreamSourceFile, { as: 'stream_source_file', foreignKey: 'stream_source_file_id' })
    StreamSegment.belongsTo(models.FileExtension, { as: 'file_extension', foreignKey: 'file_extension_id' })
  }
  StreamSegment.attributes = {
    full: ['id', 'start', 'end', 'sample_count', 'stream_id', 'stream_source_file_id', 'file_extension_id', 'created_at', 'updated_at'],
    lite: ['id', 'start', 'end']
  }
  return StreamSegment
}
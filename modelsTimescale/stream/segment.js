module.exports = function (sequelize, DataTypes) {
  const Segment = sequelize.define("Segment", {
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
      primaryKey: true,
    },
    end: {
      type: DataTypes.DATE(3),
      allowNull: false,
    },
    sample_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: {
          args: [ 1 ],
          msg: 'sample_count should be greater than 0'
        },
      }
    },
    stream_id: {
      type: DataTypes.STRING(12),
      allowNull: false
    },
    master_segment_id: {
      type: DataTypes.STRING(24),
      allowNull: false
    },
    file_extension_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    timestamps: true,
  })
  Segment.associate = function (models) {
    Segment.belongsTo(models.Stream, { as: 'stream', foreignKey: 'stream_id' })
    Segment.belongsTo(models.MasterSegment, { as: 'master_segment', foreignKey: 'master_segment_id' })
    Segment.belongsTo(models.FileExtension, { as: 'file_extension', foreignKey: 'file_extension_id' })
  }
  Segment.attributes = {
    full: ['id', 'start', 'end', 'sample_count', 'stream_id', 'master_segment_id', 'file_extension_id', 'created_at', 'updated_at'],
    lite: ['id', 'start', 'end'],
  }
  return Segment
};

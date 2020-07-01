module.exports = function (sequelize, DataTypes) {
  const StreamSourceFile = sequelize.define("StreamSourceFile", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: {
          args: [ 1 ],
          msg: 'duration should be greater than 0'
        },
      }
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
    channels_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: {
          args: [ 1 ],
          msg: 'channels_count should be greater than 0'
        },
      }
    },
    bit_rate: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    meta: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sha1_checksum: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    stream_id: {
      type: DataTypes.STRING(12),
      allowNull: false
    },
    codec_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    format_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    sample_rate_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    channel_layout_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    timestamps: true,
  })
  StreamSourceFile.associate = function (models) {
    StreamSourceFile.belongsTo(models.Stream, { as: 'stream', foreignKey: 'stream_id' })
    StreamSourceFile.belongsTo(models.Codec, { as: 'codec', foreignKey: 'codec_id' })
    StreamSourceFile.belongsTo(models.Format, { as: 'format', foreignKey: 'format_id' })
    StreamSourceFile.belongsTo(models.SampleRate, { as: 'sample_rate', foreignKey: 'sample_rate_id' })
    StreamSourceFile.belongsTo(models.ChannelLayout, { as: 'channel_layout', foreignKey: 'channel_layout_id' })
  }
  StreamSourceFile.attributes = {
    full: ['id', 'filename', 'duration', 'sample_count', 'channels_count', 'bit_rate', 'meta', 'sha1_checksum', 'stream_id',
           'codec_id', 'format_id', 'sample_rate_id', 'channel_layout_id', 'created_at', 'updated_at'],
    lite: ['id', 'filename', 'duration']
  }
  return StreamSourceFile
};

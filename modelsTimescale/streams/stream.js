module.exports = function (sequelize, DataTypes) {
  const Stream = sequelize.define('Stream', {
    id: {
      type: DataTypes.STRING(12),
      allowNull: false,
      primaryKey: true
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
      allowNull: true
    },
    end: {
      type: DataTypes.DATE(3),
      allowNull: true
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    latitude: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      validate: {
        isFloat: true,
        min: {
          args: [-90],
          msg: 'latitude should be equal to or greater than -90'
        },
        max: {
          args: [90],
          msg: 'latitude should be equal to or less than 90'
        }
      }
    },
    longitude: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      validate: {
        isFloat: true,
        min: {
          args: [-180],
          msg: 'longitude should be equal to or greater than -180'
        },
        max: {
          args: [180],
          msg: 'longitude should be equal to or less than 180'
        }
      }
    },
    max_sample_rate: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    project_id: {
      type: DataTypes.STRING(12),
      allowNull: true
    },
    created_by_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    external_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    paranoid: true,
    timestamps: true,
    deletedAt: 'deleted_at'
  })
  Stream.associate = function (models) {
    Stream.belongsTo(models.Project, { as: 'project', foreignKey: 'project_id' })
    Stream.belongsTo(models.User, { as: 'created_by', foreignKey: 'created_by_id' })
  }
  Stream.attributes = {
    full: ['id', 'name', 'description', 'start', 'end', 'is_public', 'latitude', 'longitude', 'max_sample_rate', 'project_id', 'created_by_id', 'external_id', 'created_at', 'updated_at'],
    lite: ['id', 'name', 'start', 'end', 'is_public']
  }
  const includeBase = { model: Stream, as: 'stream' }
  Stream.asInclude = {
    full: { ...includeBase, attributes: Stream.attributes.full },
    lite: { ...includeBase, attributes: Stream.attributes.lite }
  }
  return Stream
}

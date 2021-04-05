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
    altitude: {
      type: DataTypes.REAL,
      allowNull: true
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
    deletedAt: 'deleted_at',
    hooks: {
      afterCreate: async (stream, option) => {
        await updateMinMaxLatLng(stream)
      },
      afterUpdate: async (stream, option) => {
        await updateMinMaxLatLng(stream)
      },
      afterSave: async (stream, option) => {
        await updateMinMaxLatLng(stream)
      },
      afterDestroy: async (stream, option) => {
        await updateMinMaxLatLng(stream)
      }
    }
  })

  async function updateMinMaxLatLng(stream) {
    const projectId = stream.project_id
    if (projectId != null) {
      const allStreamsInProject = await sequelize.models.Stream.findAll({ where: { project_id: projectId } })
      const allLat = allStreamsInProject.map((stream) => { return stream.latitude })
      const allLng = allStreamsInProject.map((stream) => { return stream.longitude })
      // update lat lng
      await sequelize.models.Project.update({
        min_latitude: Math.min(...allLat),
        min_longitude: Math.min(...allLng),
        max_latitude: Math.max(...allLat),
        max_longitude: Math.max(...allLng)
      }, {
        where: {
          id: projectId
        }
      })
    }
  }

  Stream.associate = function (models) {
    Stream.belongsTo(models.Project, { as: 'project', foreignKey: 'project_id' })
    Stream.belongsTo(models.User, { as: 'created_by', foreignKey: 'created_by_id' })
  }
  Stream.attributes = {
    full: ['id', 'name', 'description', 'start', 'end', 'is_public', 'latitude', 'longitude', 'altitude', 'max_sample_rate', 'project_id', 'created_by_id', 'external_id', 'created_at', 'updated_at'],
    lite: ['id', 'name', 'start', 'end', 'is_public']
  }
  Stream.include = function (as = 'stream', attributes = Stream.attributes.lite, required = true) {
    return { model: Stream, as, attributes, required }
  }
  return Stream
}

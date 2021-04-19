const includeBuilder = require('../../utils/sequelize/include-builder')

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
    isPublic: {
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
    maxSampleRate: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    projectId: {
      type: DataTypes.STRING(12),
      allowNull: true
    },
    createdById: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    externalId: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    paranoid: true,
    timestamps: true,
    underscored: true,
    deletedAt: 'deleted_at',
    hooks: {
      afterCreate: async (stream, option) => {
        await updateMinMaxLatLng(stream)
      },
      afterUpdate: async (stream, option) => {
        await updateMinMaxLatLng(stream)
      },
      afterDestroy: async (stream, option) => {
        await updateMinMaxLatLng(stream)
      }
    }
  })

  async function updateMinMaxLatLng (stream) {
    const projectId = stream.projectId
    if (projectId != null) {
      const allStreamsInProject = await sequelize.models.Stream.findAll({ where: { projectId: projectId } })
      const allLat = allStreamsInProject.map((stream) => { return stream.latitude })
      const allLng = allStreamsInProject.map((stream) => { return stream.longitude })
      // update lat lng
      await sequelize.models.Project.update({
        minLatitude: Math.min(...allLat),
        minLongitude: Math.min(...allLng),
        maxLatitude: Math.max(...allLat),
        maxLongitude: Math.max(...allLng)
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
    full: ['id', 'name', 'description', 'start', 'end', 'is_public', 'latitude', 'longitude', 'altitude', 'max_sample_rate', 'external_id', 'created_at', 'updated_at'],
    lite: ['id', 'name', 'start', 'end', 'latitude', 'longitude', 'altitude', 'is_public']
  }
  Stream.include = includeBuilder(Stream, 'stream', Stream.attributes.lite)
  return Stream
}

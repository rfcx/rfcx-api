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
        await updateMinMaxLatLngFromCreate(stream)
      },
      afterUpdate: async (stream, option) => {
        if (stream.latitude !== stream._previousDataValues.latitude || stream.longitude !== stream._previousDataValues.longitude) {
          await updateMinMaxLatLngFromUpdate(stream.projectId)
        }
      },
      afterDestroy: async (stream, option) => {
        await updateMinMaxLatLngFromUpdate(stream.projectId)
      }
    }
  })

  async function updateMinMaxLatLngFromCreate (stream) {
    const projectId = stream.projectId
    if (projectId !== null) {
      const project = await sequelize.models.Project.findByPk(projectId)
      const update = {}
      if (project.minLatitude === null || stream.latitude < project.minLatitude) {
        update.minLatitude = stream.latitude
      }
      if (project.maxLatitude === null || stream.latitude > project.maxLatitude) {
        update.maxLatitude = stream.latitude
      }
      if (project.minLongitude === null || stream.longitude < project.minLongitude) {
        update.minLongitude = stream.longitude
      }
      if (project.maxLongitude === null || stream.longitude > project.maxLongitude) {
        update.maxLongitude = stream.longitude
      }
      if (Object.keys(update).length > 0) {
        await sequelize.models.Project.update(update, { where: { id: projectId } })
      }
    }
  }

  async function updateMinMaxLatLngFromUpdate (projectId) {
    if (projectId !== null) {
      const update = await sequelize.models.Stream.findAll({
        plain: true,
        raw: true,
        attributes: [
          [sequelize.fn('min', sequelize.col('latitude')), 'minLatitude'],
          [sequelize.fn('max', sequelize.col('latitude')), 'maxLatitude'],
          [sequelize.fn('min', sequelize.col('longitude')), 'minLongitude'],
          [sequelize.fn('max', sequelize.col('longitude')), 'maxLongitude']
        ],
        where: { projectId }
      })
      await sequelize.models.Project.update(update, { where: { id: projectId } })
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

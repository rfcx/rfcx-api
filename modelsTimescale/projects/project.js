module.exports = function (sequelize, DataTypes) {
  const Project = sequelize.define('Project', {
    id: {
      type: DataTypes.STRING(12),
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    organization_id: {
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
    },
    is_partner: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    min_latitude: {
      type: DataTypes.DOUBLE,
      allowNull: false
    }
    ,
    min_longitude: {
      type: DataTypes.DOUBLE,
      allowNull: false
    }
    ,
    max_latitude: {
      type: DataTypes.DOUBLE,
      allowNull: false
    }
    ,
    max_longitude: {
      type: DataTypes.DOUBLE,
      allowNull: false
    }
  }, {
    paranoid: true,
    timestamps: true,
    deletedAt: 'deleted_at'
  })
  Project.associate = function (models) {
    Project.belongsTo(models.User, { as: 'created_by', foreignKey: 'created_by_id' })
    Project.belongsTo(models.Organization, { as: 'organization', foreignKey: 'organization_id' })
    Project.hasMany(models.Stream, { as: 'streams', foreignKey: 'project_id' })
  }
  Project.attributes = {
    full: ['id', 'name', 'is_public', 'created_by_id', 'organization_id', 'external_id', 'is_partner', 'created_at', 'updated_at', 'min_latitude', 'min_longitude', 'max_latitude', 'max_longitude'],
    lite: ['id', 'name', 'is_public', 'external_id', 'min_latitude', 'min_longitude', 'max_latitude', 'max_longitude']
  }
  Project.include = function (as = 'project', attributes = Project.attributes.lite, required = true) {
    return { model: Project, as, attributes, required }
  }
  return Project
}

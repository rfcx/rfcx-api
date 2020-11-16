module.exports = function (sequelize, DataTypes) {
  const User = sequelize.define('User', {
    guid: {
      type: DataTypes.UUID,
      unique: true,
      allowNull: false
    },
    username: {
      type: DataTypes.STRING,
      unique: true
    },
    firstname: {
      type: DataTypes.STRING
    },
    lastname: {
      type: DataTypes.STRING
    },
    email: {
      type: DataTypes.STRING,
      unique: true
    },
    picture: {
      type: DataTypes.STRING
    }
  })
  User.associate = function (models) {
    User.belongsToMany(models.Role, { as: 'streams_roles', through: models.UserStreamRole })
    User.belongsToMany(models.Role, { as: 'projects_roles', through: models.UserProjectRole })
    User.belongsToMany(models.Role, { as: 'organizations_roles', through: models.UserOrganizationRole })
  }
  User.attributes = {
    full: ['firstname', 'lastname', 'picture', 'username', 'email', 'guid'],
    lite: ['firstname', 'lastname', 'email', 'picture']
  }
  return User
}

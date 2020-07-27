module.exports = function (sequelize, DataTypes) {
  const User = sequelize.define("User", {
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
      type: DataTypes.STRING,
    },
    lastname: {
      type: DataTypes.STRING,
    },
    email: {
      type: DataTypes.STRING,
      unique: true
    },
    picture: {
      type: DataTypes.STRING,
    }
  })
  User.attributes = {
    full: ['firstname', 'lastname', 'picture', 'username', 'email', 'guid'],
    lite: ['firstname', 'lastname', 'email', 'picture']
  }
  return User
};

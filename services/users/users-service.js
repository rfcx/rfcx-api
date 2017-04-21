var models = require("../../models");
var sequelize = require("sequelize");

function getUserByGuid(guid) {
  return models.User
    .findOne({
      where: { guid: guid }
    })
    .then((user) => {
      if (!user) {
        throw new sequelize.EmptyResultError('User with given guid not found.');
      }
      return user;
    });
}

function formatUser(user) {
  return {
    guid: user.guid,
    email: user.email,
    firstname: user.firstname,
    lastname: user.lastname,
    username: user.username
  }
}

module.exports = {
  getUserByGuid: getUserByGuid,
  formatUser: formatUser
};

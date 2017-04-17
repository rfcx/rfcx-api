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

module.exports = {
  getUserByGuid: getUserByGuid
};

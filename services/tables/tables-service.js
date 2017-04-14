var models = require("../../models");
var sequelize = require("sequelize");

function getTableByName(name) {

  return models.Table
    .findOne({
      where: { name: name }
    })
    .then((table) => {
      if (!table) {
        throw new sequelize.EmptyResultError('Table with given name not found.');
      }
      return table;
    });

}

module.exports = {
  getTableByName: getTableByName
};

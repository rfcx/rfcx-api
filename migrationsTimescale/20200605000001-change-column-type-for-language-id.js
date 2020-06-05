'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn('languages', 'id', {
      primaryKey: true,
      type: Sequelize.STRING(7),
      allowNull: false,
      unique: true
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn('languages', 'id', {
      primaryKey: true,
      type: Sequelize.STRING(5),
      allowNull: false,
      unique: true
    });
  }
}

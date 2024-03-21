'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn('detection_reviews', 'status', {
      type: Sequelize.SMALLINT,
      allowNull: true
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn('detection_reviews', 'status', {
      type: Sequelize.SMALLINT,
      allowNull: false
    })
  }
}

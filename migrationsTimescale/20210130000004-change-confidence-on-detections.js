'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn(
      'detections',
      'confidence',
      {
        type: Sequelize.REAL,
        allowNull: false
      }
    )
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn(
      'detections',
      'confidence',
      {
        type: Sequelize.FLOAT,
        allowNull: false
      }
    )
  }
}

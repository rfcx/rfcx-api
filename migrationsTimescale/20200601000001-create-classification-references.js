'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('classification_references', {
      classification_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: {
            tableName: 'classifications'
          },
          key: 'id'
        }
      },
      annotation_id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true
      },
      annotation_start: {
        type: Sequelize.DATE(3),
        allowNull: false
      },
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('classification_references')
  }
}

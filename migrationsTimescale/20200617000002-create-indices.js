'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('indices', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true
      },
      code: {
        type: Sequelize.STRING(8),
        allowNull: false,
        unique: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      type_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'index_types'
          },
          key: 'id'
        }
      },
      range_min: {
        type: Sequelize.FLOAT
      },
      range_max: {
        type: Sequelize.FLOAT
      }
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('indices')
  }
}

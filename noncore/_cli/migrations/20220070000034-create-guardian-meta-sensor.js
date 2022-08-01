'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('GuardianMetaSensors', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true
        },
        payload_position: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        name: {
          type: Sequelize.STRING,
          allowNull: true
        },
        component_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'GuardianMetaSensorComponents'
            },
            key: 'id'
          }
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false
        }
      }, { transaction })
      await queryInterface.addIndex('GuardianMetaSensors', ['component_id'], { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('GuardianMetaSensors')
  }
}

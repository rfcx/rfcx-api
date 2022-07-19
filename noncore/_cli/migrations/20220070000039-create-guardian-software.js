'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('GuardianSoftware', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true
        },
        role: {
          type: Sequelize.STRING,
          allowNull: false
        },
        is_available: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        is_updatable: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        is_extra: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        current_version_id: {
          type: Sequelize.INTEGER,
          allowNull: false
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
      await queryInterface.addIndex('GuardianSoftware', ['current_version_id'], { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('GuardianSoftware')
  }
}

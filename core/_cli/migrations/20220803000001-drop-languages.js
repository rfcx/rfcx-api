'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.removeConstraint('classification_alternative_names', 'classification_alternative_names_language_id_fkey')
      await queryInterface.dropTable('languages', { transaction })
      await queryInterface.changeColumn('classification_alternative_names', 'language_id', {
        type: Sequelize.STRING(5),
        allowNull: false
      }, { transaction })
    })
  },
  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.createTable('languages', {
        id: {
          primaryKey: true,
          type: Sequelize.STRING(7),
          allowNull: false,
          unique: true
        },
        name: {
          type: Sequelize.STRING(32),
          allowNull: false,
          unique: true
        }
      }, { transaction })
      await queryInterface.changeColumn('classification_alternative_names', 'language_id', {
        type: Sequelize.STRING(7),
        allowNull: false
      }, { transaction })
      await queryInterface.addConstraint('classification_alternative_names', {
        fields: ['language_id'],
        type: 'foreign key',
        name: 'classification_alternative_names_language_id_fkey',
        references: {
          table: 'languages',
          field: 'id'
        }
      }, { transaction })
    })
  }
}

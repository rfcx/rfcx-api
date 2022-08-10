'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeConstraint('Guardians', 'Guardians_creator_fkey', { transaction })
      await queryInterface.changeColumn('Guardians', 'creator', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn('Guardians', 'creator', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: 'Users'
        },
        key: 'id'
      }
    })
  }
}

'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('ShortLinks', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        guid: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        url: {
          type: Sequelize.STRING,
          allowNull: true,
          unique: false
        },
        access_count: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          validate: {
            isInt: true,
            min: 0
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
      })
      await queryInterface.addIndex('ShortLinks', ['guid'], { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('ShortLinks')
  }
}

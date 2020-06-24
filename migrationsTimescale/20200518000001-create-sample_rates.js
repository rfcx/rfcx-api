'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface
      .createTable('sample_rates', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },
        value: {
          type: Sequelize.INTEGER,
          allowNull: false,
          unique: true,
        },
      })
      .then(() => {
        return queryInterface.addConstraint('sample_rates', {
          type: 'CHECK',
          fields: ['value'],
          where: {
            value: {
              [Sequelize.Op.gt]: 0
            }
          }
        })
      })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('sample_rates')
  }
}

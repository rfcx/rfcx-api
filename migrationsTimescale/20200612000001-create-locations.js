'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface
      .createTable('locations', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          allowNull: false,
          primaryKey: true,
        },
        name: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        latitude: {
          type: Sequelize.DOUBLE,
          allowNull: false,
        },
        longitude: {
          type: Sequelize.DOUBLE,
          allowNull: false,
        },
      })
      .then(() => {
        return Promise.all([
          queryInterface.addConstraint('locations', {
            type: 'CHECK',
            fields: ['latitude'],
            where: {
              latitude: {
                [Sequelize.Op.and]: {
                  [Sequelize.Op.gte]: -90,
                  [Sequelize.Op.lte]: 90,
                }
              }
            }
          }),
          queryInterface.addConstraint('locations', {
            type: 'CHECK',
            fields: ['longitude'],
            where: {
              longitude: {
                [Sequelize.Op.and]: {
                  [Sequelize.Op.gte]: -180,
                  [Sequelize.Op.lte]: 180,
                }
              }
            }
          }),
        ])
      })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('locations');
  }
}

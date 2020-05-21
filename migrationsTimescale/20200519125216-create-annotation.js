'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Annotations', {
      id: {
        allowNull: false,
        autoIncrement: true,
        type: Sequelize.INTEGER
      },
      classificationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Classifications',
          key: 'id',
        }
      },
      streamId: {
        type: Sequelize.STRING,
        allowNull: false
      },
      start: {
        type: Sequelize.DATE(3),
        allowNull: false
      },
      end: {
        type: Sequelize.DATE(3),
        allowNull: false
      },
      frequencyMin: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      frequencyMax: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      createdBy: {
        type: Sequelize.STRING,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedBy: {
        type: Sequelize.STRING,
        allowNull: false
      }
    }).then(() => {
      queryInterface.sequelize.query('SELECT create_hypertable(\'"Annotations"\', \'start\')', {
        type: queryInterface.sequelize.QueryTypes.RAW
      })
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Annotations');
  }
};
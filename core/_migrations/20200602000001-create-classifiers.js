'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('classifiers', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
      },
      uuid: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        unique: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      version: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      min_confidence: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      min_windows_count: {
        type: Sequelize.INTEGER,
        allowNull: false
      }
    })
      .then(() => {
        return queryInterface.addConstraint('classifiers', {
          type: 'CHECK',
          fields: ['min_confidence'],
          where: {
            min_confidence: {
              [Sequelize.Op.gte]: 0
            }
          }
        })
      }).then(() => {
        return queryInterface.addConstraint('classifiers', {
          type: 'CHECK',
          fields: ['min_windows_count'],
          where: {
            min_windows_count: {
              [Sequelize.Op.gt]: 0
            }
          }
        })
      })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('classifiers')
  }
}

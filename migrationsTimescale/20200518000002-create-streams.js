'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('streams', {
      id: {
        type: Sequelize.STRING(12),
        allowNull: false,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      start: {
        type: Sequelize.DATE(3),
        allowNull: true,
      },
      end: {
        type: Sequelize.DATE(3),
        allowNull: true,
      },
      is_private: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      latitude: {
        type: Sequelize.DOUBLE,
        allowNull: true,
      },
      longitude: {
        type: Sequelize.DOUBLE,
        allowNull: true,
      },
      max_sample_rate: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      created_by_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'users'
          },
          key: 'id'
        },
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
    })
    .then(() => {
      return Promise.all([
        queryInterface.addConstraint('streams', {
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
        queryInterface.addConstraint('streams', {
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
        queryInterface.addConstraint('streams', {
          type: 'CHECK',
          fields: ['max_sample_rate'],
          where: {
            max_sample_rate: {
              [Sequelize.Op.gt]: 0
            }
          }
        })
      ])
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('streams')
  }
}

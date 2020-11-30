'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('stream_permissions', {
      stream_id: {
        type: Sequelize.STRING(12),
        allowNull: false,
        references: {
          model: {
            tableName: 'streams'
          },
          key: 'id'
        }
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: {
            tableName: 'users'
          },
          key: 'id'
        }
      },
      type: {
        type: Sequelize.STRING(1),
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
    })
      .then(() => {
        return queryInterface.addConstraint('stream_permissions', {
          type: 'CHECK',
          fields: ['type'],
          where: {
            type: {
              [Sequelize.Op.in]: ['R', 'W']
            }
          }
        })
      })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('stream_permissions')
  }
}

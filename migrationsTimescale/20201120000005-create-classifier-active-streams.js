'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('classifier_active_streams', {
      classifier_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'classifiers'
          },
          key: 'id'
        }
      },
      stream_id: {
        type: Sequelize.STRING(12),
        allowNull: false,
        references: {
          model: {
            tableName: 'streams'
          },
          key: 'id'
        }
      }
    }).then(() => {
      return queryInterface.sequelize.query('ALTER TABLE "classifier_active_streams" ADD CONSTRAINT "pk_composite" PRIMARY KEY ("classifier_id", "stream_id")')
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('classifier_active_streams')
  }
}

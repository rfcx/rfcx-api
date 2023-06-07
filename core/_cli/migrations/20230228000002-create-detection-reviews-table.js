'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return Promise.resolve().then(() => {
      return queryInterface.createTable('detection_reviews', {
        id: {
          type: Sequelize.BIGINT,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true
        },
        detection_id: {
          type: Sequelize.BIGINT,
          allowNull: false
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'users'
            },
            key: 'id'
          }
        },
        status: {
          type: Sequelize.SMALLINT,
          allowNull: false
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
        }
      })
    }).then(() => {
      return queryInterface.sequelize.query('CREATE INDEX detection_reviews_detection_id ON detection_reviews USING btree (detection_id)', {
        type: queryInterface.sequelize.QueryTypes.RAW
      })
    }).then(() => {
      return queryInterface.sequelize.query('CREATE INDEX detection_reviews_user_id ON detection_reviews USING btree (user_id)', {
        type: queryInterface.sequelize.QueryTypes.RAW
      })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('detection_reviews')
  }
}

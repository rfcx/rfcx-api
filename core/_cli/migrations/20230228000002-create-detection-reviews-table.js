'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('detection_reviews', {
        id: {
          type: Sequelize.BIGINT,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true
        },
        detection_id: {
          type: Sequelize.UUID,
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
        positive: {
          type: Sequelize.BOOLEAN,
          allowNull: true,
          default: null
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
      }, { transaction })

      await queryInterface.sequelize.query('CREATE INDEX detection_reviews_detection_id ON detection_reviews USING btree (detection_id)', {
        type: queryInterface.sequelize.QueryTypes.RAW
      }, { transaction })

      await queryInterface.sequelize.query('CREATE INDEX detection_reviews_user_id ON detection_reviews USING btree (user_id)', {
        type: queryInterface.sequelize.QueryTypes.RAW
      }, { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('detection_reviews')
  }
}

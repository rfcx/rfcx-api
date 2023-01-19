'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.createTable('detection_reviews', {
        detection_id: { // no way to add 'references' field here as sequelize throws: "there is no unique constraint matching given keys for referenced table "detections""
          type: Sequelize.INTEGER,
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
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false
        }
      }, { transaction })
      const type = queryInterface.sequelize.QueryTypes.RAW
      await queryInterface.sequelize.query(
        'CREATE INDEX detection_reviews_detection_id ON detection_reviews (detection_id);',
        { type, transaction }
      )
      await queryInterface.sequelize.query(
        'CREATE INDEX detection_reviews_user_id ON detection_reviews (user_id);',
        { type, transaction }
      )
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('detection_reviews')
  }
}

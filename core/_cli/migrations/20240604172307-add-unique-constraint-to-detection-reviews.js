'use strict'

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE
        "public"."detection_reviews"
      ADD CONSTRAINT detection_reviews_unique_detection_id_user_id_constraint UNIQUE (detection_id, user_id)
    `)
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE
        "public"."detection_reviews"
      DROP CONSTRAINT IF EXISTS detection_reviews_unique_detection_id_user_id_constraint IF EXISTS
    `)
  }
}

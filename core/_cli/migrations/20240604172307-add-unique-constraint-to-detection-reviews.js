'use strict'

const Sequelize = require('sequelize')

module.exports = {
  up: async (queryInterface) => {
    // Remove duplicates off of the `detection_reviews` table before creating the constraint.
    const recordsWithDuplicates = await queryInterface.sequelize.query(`
      SELECT
        MAX(id) as first_id,
        detection_id,
        user_id,
        COUNT(*)
      FROM detection_reviews
      GROUP BY detection_id, user_id
      HAVING COUNT(*) > 1;
    `, { type: Sequelize.QueryTypes.SELECT })

    for (const record of recordsWithDuplicates) {
      await queryInterface.sequelize.query(`
        DELETE FROM
          detection_reviews
        WHERE
          detection_id = :detectionId AND
          user_id = :userId AND
          id != :firstId
      `, {
        replacements: {
          detectionId: record.detection_id,
          userId: record.user_id,
          firstId: record.first_id
        }
      })
    }

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

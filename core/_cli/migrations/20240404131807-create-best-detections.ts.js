'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async t => {
      await queryInterface.createTable('best_detections', {
        detection_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          primaryKey: true
        },
        start: {
          type: Sequelize.DATE(3),
          allowNull: true
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
        },
        classifier_job_id: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        confidence: {
          type: Sequelize.FLOAT,
          allowNull: false
        },
        daily_ranking: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        stream_ranking: {
          type: Sequelize.INTEGER,
          allowNull: false
        }
      }, {
        timestamps: false,
        transaction: t
      })

      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS custom_stream_per_day_index
        ON public.best_detections USING btree
        (
          classifier_job_id ASC NULLS LAST,
          stream_id COLLATE pg_catalog."default" ASC NULLS LAST,
          daily_ranking ASC NULLS LAST,
          start ASC NULLS LAST,
          detection_id ASC NULLS LAST
        )
      `, { transaction: t })

      await queryInterface.sequelize.query(`
        INSERT INTO public.best_detections
        SELECT
        "detection_id", "start", "stream_id", "classifier_job_id", "confidence", "daily_ranking", "stream_ranking"
          FROM (
            SELECT
            "id" as "detection_id", "start", "stream_id", "classifier_job_id", "confidence",
            ROW_NUMBER() OVER(
              PARTITION BY classifier_job_id, stream_id, date(timezone('UTC',  "start"))
              ORDER BY confidence DESC
            ) as daily_ranking,
            ROW_NUMBER() OVER(
              PARTITION BY classifier_job_id, stream_id
              ORDER BY confidence DESC
            ) as stream_ranking
            FROM public.detections
          ) as detection
        WHERE daily_ranking < 10 OR stream_ranking < 10;
      `)
    })
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS public.best_detections;
    `)
  }
}

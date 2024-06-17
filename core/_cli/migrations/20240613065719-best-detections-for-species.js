'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.sequelize.query('DELETE FROM public."best_detections"', {
        transaction: t
      })

      await queryInterface.addColumn(
        'best_detections',
        'classification_id',
        {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'classifications'
            },
            key: 'id'
          }
        },
        { transaction: t }
      )
      await queryInterface.renameColumn(
        'best_detections',
        'daily_ranking',
        'stream_daily_ranking',
        { transaction: t }
      )
      await queryInterface.addColumn(
        'best_detections',
        'stream_classification_ranking',
        {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        { transaction: t }
      )
      await queryInterface.addColumn(
        'best_detections',
        'stream_classification_daily_ranking',
        {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        { transaction: t }
      )

      const jobs = await queryInterface.sequelize.query('select "id", "query_start", "query_end" from public.classifier_jobs', {
        transaction: t,
        type: Sequelize.QueryTypes.SELECT,
        raw: true
      })

      for (const job of jobs) {
        const replacements = {
          classifierJobId: job.id,
          dayLimit: 10,
          limit: 10,
          streamClassificationDayLimit: 5,
          jobStart: job.query_start,
          jobEnd: job.query_end
        }

        await queryInterface.sequelize.query(`
          INSERT INTO public.best_detections
          (
            "detection_id",
            "start", "stream_id", "classifier_job_id", "confidence", "classification_id",
            "stream_ranking",
            "stream_daily_ranking",
            "stream_classification_ranking",
            "stream_classification_daily_ranking"
          )
          SELECT
            "detection_id",
            "start", "stream_id", "classifier_job_id", "confidence", "classification_id"
            "stream_ranking",
            "stream_daily_ranking",
            "stream_classification_ranking",
            "stream_classification_daily_ranking",
          FROM (
              SELECT
              "id" as "detection_id",
              "start", "stream_id", "classifier_job_id", "confidence", "classification_id",
              ROW_NUMBER() OVER(
                PARTITION BY stream_id
                ORDER BY confidence DESC
              ) as stream_ranking,
              ROW_NUMBER() OVER(
                PARTITION BY stream_id, date(timezone('UTC',  "start"))
                ORDER BY confidence DESC
              ) as stream_daily_ranking,
              ROW_NUMBER() OVER(
                PARTITION BY stream_id, classification_id
                ORDER BY confidence DESC
              ) as stream_classification_ranking,
              ROW_NUMBER() OVER(
                PARTITION BY stream_id, classification_id, date(timezone('UTC',  "start"))
                ORDER BY confidence DESC
              ) as stream_classification_daily_ranking
              FROM public.detections
              WHERE (start BETWEEN :jobStart AND :jobEnd) AND classifier_job_id = :classifierJobId
            ) as detection
          WHERE stream_ranking < :limit OR stream_classification_ranking < :limit OR
                stream_daily_ranking < :dayLimit OR
                stream_classification_daily_ranking < :streamClassificationDayLimit;`,
        {
          replacements,
          type: Sequelize.QueryTypes.RAW,
          transaction: t
        })
      }
    })
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeColumn(
        'best_detections',
        'classification_id',
        { transaction: t }
      )
      await queryInterface.renameColumn(
        'best_detections',
        'stream_daily_ranking',
        'daily_ranking',
        { transaction: t }
      )
      await queryInterface.removeColumn(
        'best_detections',
        'stream_classification_ranking',
        { transaction: t }
      )
      await queryInterface.removeColumn(
        'best_detections',
        'stream_classification_daily_ranking',
        { transaction: t }
      )
    })
  }
}

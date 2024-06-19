const { BestDetection, sequelize } = require('../../_models')

const BEST_ITEMS_PER_DAY_STREAM_LIMIT = 10
const BEST_ITEMS_PER_STREAM_LIMIT = 10
const BEST_ITEMS_PER_STREAM_CLASSIFICATION_DAY = 5

module.exports.dropBestDetections = async function dropBestDetections (classifierJob) {
  const where = { classifierJobId: classifierJob.id }
  await BestDetection.destroy({ where })
}

module.exports.saveBestDetections = async function cacheBestDetections (classifierJob) {
  const replacements = {
    classifierJobId: classifierJob.id,
    dayLimit: BEST_ITEMS_PER_DAY_STREAM_LIMIT,
    limit: BEST_ITEMS_PER_STREAM_LIMIT,
    streamClassificationDayLimit: BEST_ITEMS_PER_STREAM_CLASSIFICATION_DAY,
    jobStart: classifierJob.queryStart,
    jobEnd: classifierJob.queryEnd
  }

  await sequelize.query(`
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
      "start", "stream_id", "classifier_job_id", "confidence", "classification_id",
      "stream_ranking",
      "stream_daily_ranking",
      "stream_classification_ranking",
      "stream_classification_daily_ranking"
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
    WHERE stream_ranking < :limit OR
          stream_classification_ranking < :limit OR
          stream_daily_ranking < :dayLimit OR
          stream_classification_daily_ranking < :streamClassificationDayLimit;`,
  {
    replacements,
    type: sequelize.QueryTypes.RAW
  })
}

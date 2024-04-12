const { BestDetection, sequelize } = require('../../_models')

const BEST_ITEMS_PER_DAY_STREAM_LIMIT = 10
const BEST_ITEMS_PER_STREAM_LIMIT = 10

module.exports.dropBestDetections = async function dropBestDetections (classifierJob) {
  const where = { classifierJobId: classifierJob.id }
  await BestDetection.destroy({ where })
}

module.exports.saveBestDetections = async function cacheBestDetections (classifierJob) {
  const replacements = {
    classifierJobId: classifierJob.id === null ? -1 : classifierJob.id,
    perDayLimit: BEST_ITEMS_PER_DAY_STREAM_LIMIT,
    perStreamLimit: BEST_ITEMS_PER_STREAM_LIMIT,
    jobStart: classifierJob.queryStart,
    jobEnd: classifierJob.queryEnd
  }

  await sequelize.query(`
    INSERT INTO public.best_detections
    SELECT
    "detection_id", "start", "stream_id", "classifier_job_id", "confidence", "daily_ranking", "stream_ranking"
      FROM (
        SELECT
        "id" as "detection_id", "start", "stream_id", "classifier_job_id", "confidence",
        ROW_NUMBER() OVER(
          PARTITION BY stream_id, date(timezone('UTC',  "start"))
          ORDER BY confidence DESC
        ) as daily_ranking,
        ROW_NUMBER() OVER(
          PARTITION BY stream_id
          ORDER BY confidence DESC
        ) as stream_ranking
        FROM public.detections
        WHERE (start BETWEEN :jobStart AND :jobEnd) AND COALESCE(classifier_job_id, -1) = :classifierJobId
      ) as detection
    WHERE daily_ranking < :perDayLimit OR stream_ranking < :perStreamLimit;
  `, {
    replacements,
    type: sequelize.QueryTypes.RAW
  })
}

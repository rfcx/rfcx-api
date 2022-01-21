const models = require('../../_models')
const sqlUtils = require('../../../utils/misc/sql')

const condAdd = sqlUtils.condAdd

function getLabelsData (filterOpts) {
  let sql = 'SELECT a.guid, t.begins_at_offset, t.ends_at_offset, (t.ends_at_offset - t.begins_at_offset) as duration, ROUND(AVG(t.confidence)) as confidence FROM GuardianAudioTags t LEFT JOIN GuardianAudio a on a.id=t.audio_id where 1=1 '

  sql = condAdd(sql, filterOpts.tagType, ' and t.type = :tagType')
  sql = condAdd(sql, filterOpts.tagValues, ' and t.value in (:tagValues)')
  sql = condAdd(sql, filterOpts.start, ' and a.measured_at >= :start')
  sql = condAdd(sql, filterOpts.end, ' and a.measured_at < :end')
  sql = condAdd(sql, filterOpts.audioGuids, ' and a.guid in (:audioGuids)')
  sql = condAdd(sql, true, ' group by t.audio_id, begins_at_offset having count(DISTINCT t.tagged_by_user) >= 1 order by t.begins_at_offset ASC')

  return models.sequelize.query(sql,
    { replacements: filterOpts, type: models.sequelize.QueryTypes.SELECT }
  )
}

module.exports = {
  getLabelsData: getLabelsData
}

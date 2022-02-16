const express = require('express')
const router = express.Router()
const views = require('../../views/v1')
const passport = require('passport')
passport.use(require('../../../common/middleware/passport-token').TokenStrategy)
const ApiConverter = require('../../_utils/api-converter')
const requireUser = require('../../../common/middleware/authorization/authorization').requireTokenType('user')
const models = require('../../_models')
const sqlUtils = require('../../_utils/db/sql-cond-add')
const csvUtils = require('../../_utils/misc/csv')
const datafiltersService = require('../../_services/datafilters/datafilters-service')

const condAdd = sqlUtils.condAdd

function filter (filterOpts) {
  // the WHERE 1=1 allows us to add new conditions always with AND otherwise we have to make sure that a previous
  // condition was met that inserted the WHERE clause
  let sql = 'SELECT DISTINCT a.guid FROM GuardianAudio a LEFT JOIN GuardianAudioTags t on a.id=t.audio_id' +
         ' INNER JOIN GuardianSites s ON a.site_id=s.id where 1=1'

  // filter out files annotated by user
  if (filterOpts.annotator) {
    if (filterOpts.ignoreCorrupted) {
      sql += ' and a.id not in (SELECT DISTINCT sq.audio_id FROM GuardianAudioTags sq where sq.type="warning" OR (sq.tagged_by_user=:annotator and sq.type="label"))'
    } else {
      sql += ' and a.id not in (SELECT DISTINCT sq.audio_id FROM GuardianAudioTags sq where sq.tagged_by_user=:annotator and sq.type="label")'
    }
  } else {
    if (filterOpts.ignoreCorrupted) {
      // filter out corrupted files - TODO: we need to improve the index scan otherwise this is inefficient
      sql += ' and a.id not in (SELECT DISTINCT sq.audio_id FROM GuardianAudioTags sq where sq.type="warning")'
    }
  }

  sql = condAdd(sql, filterOpts.start, ' and a.measured_at >= :start')
  sql = condAdd(sql, filterOpts.end, ' and a.measured_at < :end')
  sql = condAdd(sql, filterOpts.todStart, ' and TIME(a.measured_at) >= :todStart')
  sql = condAdd(sql, filterOpts.todEnd, ' and TIME(a.measured_at) < :todEnd')
  sql = condAdd(sql, filterOpts.sites, ' and s.guid in (:sites)')
  sql = condAdd(sql, filterOpts.tagType, ' and t.type = :tagType')
  sql = condAdd(sql, filterOpts.tagValues, ' and t.value in (:tagValues)')
  sql = condAdd(sql, filterOpts.lowConfidence, ' and t.confidence <= 0.5')
  sql = condAdd(sql, filterOpts.highConfidence, ' and t.confidence > 0.5')
  sql = condAdd(sql, filterOpts.audioGuids, ' and a.guid in (:audioGuids)')
  sql = condAdd(sql, filterOpts.hasLabels, ' group by a.guid having count(DISTINCT t.tagged_by_user) >= 1')
  sql = condAdd(sql, !filterOpts.hasLabels, ' group by a.guid having count(DISTINCT t.tagged_by_user) < 3 order by count(DISTINCT t.tagged_by_user) DESC, RAND()')
  sql = condAdd(sql, filterOpts.limit, ' LIMIT :limit')

  return models.sequelize.query(sql,
    { replacements: filterOpts, type: models.sequelize.QueryTypes.SELECT }
  )
}

function processResults (promise, req, res) {
  return promise.then(function (data) {
    return processSuccess(data, req, res)
  }).catch(function (err) {
    processError(err, req, res)
  })
}

function extractAudioGuids (data) {
  const arr = []
  for (let i = 0; i < data.length; i++) {
    arr.push(data[i].guid)
  }
  return arr
}

// function getLabelsData(filterOpts) {

//   var sql = 'SELECT a.guid, t.begins_at_offset, t.ends_at_offset, (t.ends_at_offset - t.begins_at_offset) as duration, ROUND(AVG(t.confidence)) as confidence FROM GuardianAudioTags t LEFT JOIN GuardianAudio a on a.id=t.audio_id where 1=1 ';

//   sql = condAdd(sql, filterOpts.tagType, ' and t.type = :tagType');
//   sql = condAdd(sql, filterOpts.tagValues, ' and t.value in (:tagValues)');
//   sql = condAdd(sql, filterOpts.start, ' and a.measured_at >= :start');
//   sql = condAdd(sql, filterOpts.end, ' and a.measured_at < :end');
//   sql = condAdd(sql, filterOpts.audioGuids, ' and a.guid in (:audioGuids)');
//   sql = condAdd(sql, true, ' group by t.audio_id, begins_at_offset having count(DISTINCT t.tagged_by_user) >= 1 order by t.begins_at_offset ASC');

//   return models.sequelize.query(sql,
//     { replacements: filterOpts, type: models.sequelize.QueryTypes.SELECT }
//   );
// }

function processSuccess (data, req, res) {
  return views.models.DataFilterAudioGuidToJson(req, res, data).then(function (result) {
    res.status(200).json(result)
  })
}

function processError (err, req, res) {
  if (err) {
    console.log('err', err)
    res.status(500).json({ msg: err })
  }
}

function combineFilterOpts (req) {
  const body = req.body

  const filterOpts = {
    limit: parseInt(body.limit) || 1,
    hasLabels: body.hasLabels || false
  }

  if (body.ignoreCorrupted) {
    filterOpts.ignoreCorrupted = Boolean(body.ignoreCorrupted)
  }
  if (!body.ignoreAnnotator) {
    filterOpts.annotator = req.rfcx.auth_token_info.owner_id
  }
  if (body.site) {
    filterOpts.sites = [body.site]
  }
  if (body.guardian) {
    filterOpts.guardians = [body.guardian]
  }

  if (body.start) {
    filterOpts.start = body.start
  }

  if (body.end) {
    filterOpts.end = body.end
  }

  if (body.tagType) {
    filterOpts.tagType = body.tagType
  }

  if (body.highConfidence) {
    filterOpts.highConfidence = Boolean(body.highConfidence)
  }

  if (body.lowConfidence) {
    filterOpts.lowConfidence = Boolean(body.lowConfidence)
  }

  if (body.audioGuids) {
    filterOpts.audioGuids = body.audioGuids.split(',')
  }

  // if tag was specified, then flip coin
  if (req.params.tagValue) {
    // if true then search for audios tagged with specified tag
    // Todo: for now we need more of the files for tags, so we'll always search for tags - we need to remove true soon
    filterOpts.tagValues = req.params.tagValue
  }

  return filterOpts
}

router.route('/csv/:tagValue')
  .post(passport.authenticate('token', { session: false }), requireUser, function (req, res) {
    const filterOpts = combineFilterOpts(req)

    filter(filterOpts)
      .bind({})
      .then(function (data) {
        this.guids = data
        filterOpts.audioGuids = extractAudioGuids(data)
        return datafiltersService.getLabelsData(filterOpts)
      })
      .then(function (labels) {
        return views.models.DataFilterAudioGuidToJson(req, res, {
          guids: this.guids,
          labels: labels
        })
      })
      .then(function (dataObj) {
        return csvUtils.generateCSV(dataObj.data.attributes.labels, req.params.tagValue)
      })
      .then(function (csv) {
        res.contentType('text/csv')
        res.attachment('event.csv')
        res.status(200).send(csv)
      })
  })

router.route('/labelling/:tagValue?')
  .post(passport.authenticate('token', { session: false }), requireUser, function (req, res) {
    const body = req.body

    const filterOpts = combineFilterOpts(req)

    filter(filterOpts).bind({})
      .then(function (guids) {
        // if we found result then act like always...
        if (guids.length || body.noRandomValues) {
          return guids
        } else { // if we not found any guids then go another way
          // search random guids without tagging by model property
          delete filterOpts.tagType
          delete filterOpts.tagValues
          delete filterOpts.highConfidence
          delete filterOpts.lowConfidence
          filterOpts.hasLabels = false
          // then return result whatever it will be - founded guids or empty array
          return filter(filterOpts)
        }
      })
      .then(function (data) {
        this.guids = data
        if (body.withCSV && data.length) {
          // simplify tags query - search only in received guids
          filterOpts.audioGuids = extractAudioGuids(data)
          return datafiltersService.getLabelsData(filterOpts)
        } else {
          return null
        }
      })
      .then(function (labels) {
        return processSuccess({
          guids: this.guids,
          labels: labels
        }, req, res)
      })
      .catch(function (err) {
        processError(err, req, res)
      })
  })

router.route('/')
  .post(passport.authenticate('token', { session: false }), requireUser, function (req, res) {
    const converter = new ApiConverter('datafilter', req)
    const filterOpts = converter.mapApiToPojo(req.body)
    const promise = filter(filterOpts)
    processResults(promise, req, res)
  })
module.exports = router
